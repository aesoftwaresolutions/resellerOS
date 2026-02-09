// ios/SupabaseSetup.swift
// ═══════════════════════════════════════════════════════
//  iOS Supabase Real-Time Integration Guide
//
//  Add to your Xcode project:
//    1. Swift Package Manager → Add Package
//       URL: https://github.com/supabase-community/supabase-swift
//    2. Import in your files: import Supabase
//
//  This file shows how to connect your iOS app to the
//  same Supabase database so web + iOS stay in sync.
// ═══════════════════════════════════════════════════════

import Foundation
import Supabase

// MARK: - Supabase Client Configuration

struct AppConfig {
    static let supabaseURL = URL(string: "https://YOUR_PROJECT.supabase.co")!
    static let supabaseAnonKey = "YOUR_ANON_KEY"
}

let supabase = SupabaseClient(
    supabaseURL: AppConfig.supabaseURL,
    supabaseKey: AppConfig.supabaseAnonKey
)

// MARK: - Real-Time Subscriptions

/// Subscribe to product changes for the current user.
/// Call this once when the app launches or user logs in.
///
///     let subscription = RealtimeManager.shared
///     subscription.subscribeToProducts(userId: "abc-123") { change in
///         // Refresh your SwiftUI @Published array
///     }
///
class RealtimeManager: ObservableObject {
    static let shared = RealtimeManager()
    
    @Published var latestSale: Sale?
    @Published var isConnected = false
    
    private var channel: RealtimeChannelV2?
    
    /// Subscribe to all product changes for a user
    func subscribeToProducts(userId: String, onChange: @escaping (any PostgresAction) -> Void) {
        let channel = supabase.realtimeV2.channel("products-\(userId)")
        
        let changes = channel.postgresChange(
            AnyAction.self,
            schema: "public",
            table: "products",
            filter: .eq("user_id", value: userId)
        )
        
        Task {
            await channel.subscribe()
            self.isConnected = true
            
            for await change in changes {
                await MainActor.run {
                    onChange(change)
                }
            }
        }
        
        self.channel = channel
    }
    
    /// Subscribe to new sales
    func subscribeToSales(userId: String) {
        let channel = supabase.realtimeV2.channel("sales-\(userId)")
        
        let inserts = channel.postgresChange(
            InsertAction.self,
            schema: "public",
            table: "sales",
            filter: .eq("user_id", value: userId)
        )
        
        Task {
            await channel.subscribe()
            
            for await insert in inserts {
                let sale = try? insert.decodeRecord(as: Sale.self, decoder: JSONDecoder())
                await MainActor.run {
                    self.latestSale = sale
                    // Trigger notification, refresh UI, etc.
                }
            }
        }
    }
    
    /// Subscribe to listing changes (delists, status updates)
    func subscribeToListings(userId: String, onChange: @escaping ([Listing]) -> Void) {
        let channel = supabase.realtimeV2.channel("listings-\(userId)")
        
        let changes = channel.postgresChange(
            AnyAction.self,
            schema: "public",
            table: "listings",
            filter: .eq("user_id", value: userId)
        )
        
        Task {
            await channel.subscribe()
            
            for await _ in changes {
                // Re-fetch full list on any change
                let listings = try await fetchListings(userId: userId)
                await MainActor.run { onChange(listings) }
            }
        }
    }
    
    func disconnect() {
        Task {
            if let channel = self.channel {
                await supabase.realtimeV2.removeChannel(channel)
            }
        }
        isConnected = false
    }
}

// MARK: - Data Models (match your PostgreSQL schema)

struct Product: Codable, Identifiable {
    let id: String
    let title: String
    let brand: String?
    let category: String?
    let size: String?
    let color: String?
    let condition: String?
    let basePrice: Decimal?
    let costPrice: Decimal?
    let floorPrice: Decimal?
    let status: String
    let quantity: Int
    let sku: String?
    let daysListed: Int?
    let createdAt: Date?
    let updatedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id, title, brand, category, size, color, condition, status, quantity, sku
        case basePrice = "base_price"
        case costPrice = "cost_price"
        case floorPrice = "floor_price"
        case daysListed = "days_listed"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct Listing: Codable, Identifiable {
    let id: String
    let productId: String
    let marketplaceId: String
    let status: String
    let listedPrice: Decimal?
    let estimatedPayout: Decimal?
    let externalUrl: String?
    let lastSyncedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id, status
        case productId = "product_id"
        case marketplaceId = "marketplace_id"
        case listedPrice = "listed_price"
        case estimatedPayout = "estimated_payout"
        case externalUrl = "external_url"
        case lastSyncedAt = "last_synced_at"
    }
}

struct Sale: Codable, Identifiable {
    let id: String
    let productTitle: String?
    let marketplaceId: String
    let salePrice: Decimal
    let marketplaceFee: Decimal?
    let profit: Decimal?
    let soldAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case productTitle = "product_title"
        case marketplaceId = "marketplace_id"
        case salePrice = "sale_price"
        case marketplaceFee = "marketplace_fee"
        case profit
        case soldAt = "sold_at"
    }
}

// MARK: - CRUD Operations (direct to Supabase)

/// Fetch products for the current user
func fetchProducts(userId: String) async throws -> [Product] {
    let response: [Product] = try await supabase
        .from("products")
        .select()
        .eq("user_id", value: userId)
        .order("created_at", ascending: false)
        .execute()
        .value
    return response
}

/// Fetch listings for the current user
func fetchListings(userId: String) async throws -> [Listing] {
    let response: [Listing] = try await supabase
        .from("listings")
        .select()
        .eq("user_id", value: userId)
        .order("created_at", ascending: false)
        .execute()
        .value
    return response
}

/// Update a product price (will trigger real-time sync to web + Sheets)
func updateProductPrice(productId: String, newPrice: Decimal) async throws {
    try await supabase
        .from("products")
        .update(["base_price": newPrice, "updated_at": Date()])
        .eq("id", value: productId)
        .execute()
}

/// Record a manual sale
func recordSale(data: [String: Any]) async throws {
    try await supabase
        .from("sales")
        .insert(data)
        .execute()
}

// MARK: - SwiftUI Example Usage

/*
import SwiftUI

struct InventoryView: View {
    @StateObject private var realtime = RealtimeManager.shared
    @State private var products: [Product] = []
    
    var body: some View {
        NavigationStack {
            List(products) { product in
                HStack {
                    VStack(alignment: .leading) {
                        Text(product.title).font(.headline)
                        Text(product.brand ?? "").font(.subheadline).foregroundColor(.secondary)
                    }
                    Spacer()
                    Text("$\(product.basePrice ?? 0, specifier: "%.2f")")
                        .fontWeight(.bold)
                }
            }
            .navigationTitle("Inventory")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Circle()
                        .fill(realtime.isConnected ? Color.green : Color.red)
                        .frame(width: 8, height: 8)
                }
            }
        }
        .task {
            // Load initial data
            products = (try? await fetchProducts(userId: "current-user-id")) ?? []
            
            // Subscribe to real-time updates
            realtime.subscribeToProducts(userId: "current-user-id") { _ in
                Task {
                    products = (try? await fetchProducts(userId: "current-user-id")) ?? []
                }
            }
        }
    }
}
*/
