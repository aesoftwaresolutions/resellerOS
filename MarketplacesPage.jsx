// src/pages/MarketplacesPage.jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Link2, Unlink, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { LoadingSpinner, Modal } from '../components/common';
import { marketplaces } from '../api/endpoints';
import { timeAgo } from '../utils/helpers';
import { useState } from 'react';

const MARKETPLACE_ICONS = {
  ebay: { color: '#3b82f6', initials: 'eB' },
  poshmark: { color: '#ef4444', initials: 'PM' },
  mercari: { color: '#fb7185', initials: 'Me' },
  depop: { color: '#f97316', initials: 'De' },
  facebook: { color: '#6366f1', initials: 'FB' },
  grailed: { color: '#78716c', initials: 'Gr' },
  kidizen: { color: '#f472b6', initials: 'Ki' },
  vestiaire: { color: '#a78bfa', initials: 'VC' },
};

export default function MarketplacesPage() {
  const queryClient = useQueryClient();
  const [connectModal, setConnectModal] = useState(null);
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  const { data: allMarketplaces, isLoading: loadingMkt } = useQuery({
    queryKey: ['marketplaces'],
    queryFn: () => marketplaces.list(),
  });

  const { data: connections, isLoading: loadingConn } = useQuery({
    queryKey: ['connections'],
    queryFn: () => marketplaces.connections(),
  });

  const connectMut = useMutation({
    mutationFn: (data) => marketplaces.connect(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['connections']);
      setConnectModal(null);
      setCredentials({ email: '', password: '' });
      toast.success('Marketplace connected!');
    },
  });

  const disconnectMut = useMutation({
    mutationFn: (id) => marketplaces.disconnect(id),
    onSuccess: () => { queryClient.invalidateQueries(['connections']); toast.success('Disconnected'); },
  });

  const syncMut = useMutation({
    mutationFn: (connId) => marketplaces.sync(connId),
    onSuccess: () => { queryClient.invalidateQueries(['connections']); toast.success('Sync completed'); },
  });

  const mktList = allMarketplaces?.data || [];
  const connList = connections?.data || [];
  const connMap = {};
  connList.forEach(c => { connMap[c.marketplace_id] = c; });

  const handleConnect = async (mkt) => {
    if (mkt.integration_type === 'api') {
      // OAuth flow — get auth URL and redirect
      const res = await marketplaces.getOAuthUrl(mkt.id);
      if (res.data.authUrl) {
        window.location.href = res.data.authUrl;
        return;
      }
    }
    // Automation-based — show credentials modal
    setConnectModal(mkt);
  };

  const handleCredentialSubmit = () => {
    if (!credentials.email || !credentials.password) return toast.error('Both fields required');
    connectMut.mutate({
      marketplaceId: connectModal.id,
      credentials: { email: credentials.email, password: credentials.password },
    });
  };

  if (loadingMkt) return <PageLoadingFallback />;

  return (
    <div>
      <Header title="Marketplaces" subtitle="Connect your selling accounts" />

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mktList.map((mkt) => {
            const conn = connMap[mkt.id];
            const isConnected = conn?.status === 'connected';
            const icon = MARKETPLACE_ICONS[mkt.id] || { color: '#718096', initials: mkt.id.substring(0, 2).toUpperCase() };

            return (
              <div key={mkt.id} className={`glass-card p-5 transition-all duration-200 ${!mkt.active ? 'opacity-50' : 'glow-border'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-white text-sm"
                      style={{ backgroundColor: icon.color + '30', color: icon.color }}
                    >
                      {icon.initials}
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-surface-900">{mkt.name}</h3>
                      <p className="text-xs text-surface-500 capitalize">{mkt.integration_type} integration</p>
                    </div>
                  </div>
                  {isConnected ? (
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  ) : conn?.status === 'error' ? (
                    <AlertCircle size={20} className="text-red-400" />
                  ) : null}
                </div>

                {isConnected && (
                  <div className="mb-4 p-3 bg-surface-200/40 rounded-xl space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-surface-500">Username</span>
                      <span className="text-surface-800 font-medium">{conn.marketplace_username || '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-surface-500">Last sync</span>
                      <span className="text-surface-800">{conn.last_sync_at ? timeAgo(conn.last_sync_at) : 'Never'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-surface-500">Status</span>
                      <span className="text-emerald-400 font-medium">Connected</span>
                    </div>
                  </div>
                )}

                {conn?.status === 'error' && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-xs text-red-400">Connection error: {conn.last_error || 'Unknown'}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <>
                      <button onClick={() => syncMut.mutate(conn.id)} disabled={syncMut.isLoading} className="btn-secondary btn-sm flex-1">
                        <RefreshCw size={14} className={syncMut.isLoading ? 'animate-spin' : ''} /> Sync
                      </button>
                      <button onClick={() => disconnectMut.mutate(mkt.id)} className="btn-ghost btn-sm text-red-400 hover:bg-red-500/10">
                        <Unlink size={14} />
                      </button>
                    </>
                  ) : mkt.active ? (
                    <button onClick={() => handleConnect(mkt)} className="btn-primary btn-sm flex-1">
                      <Link2 size={14} /> Connect
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-surface-500">
                      <Clock size={14} /> Coming soon
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Credentials Modal */}
      <Modal isOpen={!!connectModal} onClose={() => setConnectModal(null)} title={`Connect ${connectModal?.name}`} size="sm">
        <p className="text-sm text-surface-600 mb-4">
          Enter your {connectModal?.name} login credentials. These are encrypted and used only for automation.
        </p>
        <div className="space-y-3">
          <div>
            <label className="input-label">Email</label>
            <input type="email" value={credentials.email} onChange={e => setCredentials(p => ({ ...p, email: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="input-label">Password</label>
            <input type="password" value={credentials.password} onChange={e => setCredentials(p => ({ ...p, password: e.target.value }))} className="input-field" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={() => setConnectModal(null)} className="btn-secondary btn-sm">Cancel</button>
          <button onClick={handleCredentialSubmit} disabled={connectMut.isLoading} className="btn-primary btn-sm">
            {connectMut.isLoading ? 'Connecting…' : 'Connect'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function PageLoadingFallback() {
  return <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner /></div>;
}
