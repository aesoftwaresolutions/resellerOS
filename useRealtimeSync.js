// src/hooks/useRealtimeSync.js
// ═══════════════════════════════════════════════════════
//  Supabase Realtime Hook
//
//  Subscribe to live database changes from Supabase.
//  Works identically in web (React) and iOS (via Swift SDK).
//
//  Usage:
//    const { products, listings, sales, connected } = useRealtimeSync();
//
//  Or subscribe to a specific table:
//    const { data } = useRealtimeTable('products', { userId });
// ═══════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

// Initialize Supabase client (reads from env)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Subscribe to all real-time changes for the current user.
 * Automatically invalidates React Query caches so UI updates instantly.
 */
export function useRealtimeSync(userId) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!supabase || !userId) return;

    // Subscribe to all changes on tables filtered by user_id
    const channel = supabase
      .channel(`user-sync-${userId}`)

      // Products — any insert/update/delete
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `user_id=eq.${userId}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['product', payload.new?.id] });

          if (payload.eventType === 'UPDATE') {
            // Show toast for price changes
            if (payload.old?.base_price !== payload.new?.base_price) {
              toast(`💰 Price updated: ${payload.new.title}`, { icon: '📊' });
            }
          }
        }
      )

      // Listings — cross-platform sync
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings', filter: `user_id=eq.${userId}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['listings'] });

          if (payload.eventType === 'INSERT') {
            toast.success(`Listed on ${payload.new.marketplace_id}`);
          }
          if (payload.eventType === 'UPDATE' && payload.new?.status === 'delisted') {
            toast(`🚫 Delisted from ${payload.new.marketplace_id}`, { icon: '🔄' });
          }
        }
      )

      // Sales — new sale detected
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales', filter: `user_id=eq.${userId}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['sales'] });
          queryClient.invalidateQueries({ queryKey: ['salesSummary'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });

          const sale = payload.new;
          toast.success(
            `🎉 Sold! ${sale.product_title || 'Item'} on ${sale.marketplace_id} for $${sale.sale_price}`,
            { duration: 6000 }
          );
        }
      )

      // Automation tasks — status updates
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'automation_tasks', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.new?.status === 'failed') {
            toast.error(`Task failed: ${payload.new.task_type}`);
          }
        }
      )

      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          console.log('🔗 Supabase Realtime connected');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, queryClient]);

  return { connected, supabase };
}

/**
 * Subscribe to a single table's changes and return live data.
 * Lower-level hook for custom use cases.
 */
export function useRealtimeTable(table, { userId, onInsert, onUpdate, onDelete } = {}) {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!supabase || !userId) return;

    // Initial fetch
    supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data: rows }) => {
        if (rows) setData(rows);
      });

    // Subscribe to changes
    const channel = supabase
      .channel(`${table}-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT':
              setData(prev => [payload.new, ...prev]);
              onInsert?.(payload.new);
              break;
            case 'UPDATE':
              setData(prev => prev.map(row => row.id === payload.new.id ? payload.new : row));
              onUpdate?.(payload.new, payload.old);
              break;
            case 'DELETE':
              setData(prev => prev.filter(row => row.id !== payload.old.id));
              onDelete?.(payload.old);
              break;
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [table, userId]);

  return { data };
}

/**
 * Broadcast channel hook — for custom real-time events
 * (not tied to DB tables, e.g. notifications, typing indicators)
 */
export function useRealtimeBroadcast(channelName, eventHandler) {
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: '*' }, (payload) => {
        eventHandler?.(payload);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [channelName, eventHandler]);
}

export { supabase };
