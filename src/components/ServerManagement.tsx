import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Server, 
  Globe, 
  Activity, 
  MapPin, 
  Shield, 
  Cpu, 
  HardDrive,
  Trash2,
  Edit2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Bell
} from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { format, parseISO } from 'date-fns';
import { cn } from '../utils';
import toast from 'react-hot-toast';

interface ServerManagementProps {
  servers: any[];
}

export function ServerManagement({ servers }: ServerManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [providerFilter, setProviderFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<any>(null);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [validationError, setValidationError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    uptimeRobotUrl: '',
    location: '',
    status: 'Online',
    ipAddress: '',
    provider: '',
    notes: ''
  });

  // Periodic status check
  useEffect(() => {
    const checkAllServers = () => {
      servers.forEach(server => checkServerStatus(server, true));
    };

    // Initial check
    checkAllServers();

    const interval = setInterval(checkAllServers, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [servers.length]); // Only re-run if server count changes

  const checkServerStatus = async (server: any, notify: boolean = false) => {
    try {
      // Use a proxy or a simple fetch with no-cors to check reachability
      // Note: no-cors won't give us the status code, but it will throw if unreachable
      await fetch(server.url, { method: 'HEAD', mode: 'no-cors', cache: 'no-cache' });
      
      const newStatus = 'Online';
      if (server.status !== newStatus) {
        await updateDoc(doc(db, 'servers', server.id), {
          status: newStatus,
          lastCheckedAt: new Date().toISOString()
        });
        if (notify && server.status === 'Offline') {
          toast.success(`Server ${server.name} is back online!`, {
            icon: '✅',
            duration: 5000,
          });
        }
      }
    } catch (error) {
      const newStatus = 'Offline';
      if (server.status !== newStatus) {
        await updateDoc(doc(db, 'servers', server.id), {
          status: newStatus,
          lastCheckedAt: new Date().toISOString()
        });
        if (notify) {
          toast.error(`Alert: Server ${server.name} is offline!`, {
            icon: '🚨',
            duration: 10000,
          });
        }
      }
    }
  };

  const filteredServers = servers.filter(server => {
    const name = server.name || '';
    const location = server.location || '';
    const url = server.url || '';
    const matchesSearch = 
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || server.status === statusFilter;
    const matchesProvider = providerFilter === 'All' || server.provider === providerFilter;
    const matchesLocation = locationFilter === 'All' || server.location === locationFilter;
    return matchesSearch && matchesStatus && matchesProvider && matchesLocation;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    try {
      if (editingServer) {
        await updateDoc(doc(db, 'servers', editingServer.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'servers'), {
          ...formData,
          createdAt: new Date().toISOString(),
          status: 'Online'
        });
      }
      setIsAddModalOpen(false);
      setEditingServer(null);
      setFormData({
        name: '',
        url: '',
        uptimeRobotUrl: '',
        location: '',
        status: 'Online',
        ipAddress: '',
        provider: '',
        notes: ''
      });
    } catch (error: any) {
      setValidationError(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this server?')) {
      try {
        await deleteDoc(doc(db, 'servers', id));
      } catch (error) {
        console.error("Error deleting server:", error);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-brand-text mb-1 tracking-tight">Server Infrastructure</h2>
          <p className="text-brand-text-muted text-sm font-medium">Real-time monitoring and management of your global server fleet.</p>
        </div>
        <button 
          onClick={() => {
            setEditingServer(null);
            setValidationError('');
            setFormData({
              name: '',
              url: '',
              uptimeRobotUrl: '',
              location: '',
              status: 'Online',
              ipAddress: '',
              provider: '',
              notes: ''
            });
            setIsAddModalOpen(true);
          }}
          className="clay-btn-primary flex items-center gap-2 text-sm font-bold shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Add Server
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Online', count: servers.filter(s => s.status === 'Online').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
          { label: 'Offline', count: servers.filter(s => s.status === 'Offline').length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-500/10' },
          { label: 'Maintenance', count: servers.filter(s => s.status === 'Maintenance').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <div key={i} className="clay-card p-6 border-none shadow-clay">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-2xl", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-2xl font-bold text-brand-text tracking-tight">{stat.count}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted w-4 h-4 opacity-50" />
          <input 
            type="text" 
            placeholder="Search servers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="clay-input w-full pl-11 py-3"
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="clay-input appearance-none py-3"
        >
          <option value="All">All Statuses</option>
          <option value="Online">Online</option>
          <option value="Offline">Offline</option>
          <option value="Maintenance">Maintenance</option>
        </select>
        <select 
          value={providerFilter} 
          onChange={(e) => setProviderFilter(e.target.value)}
          className="clay-input appearance-none py-3"
        >
          <option value="All">All Providers</option>
          {[...new Set(servers.map(s => s.provider))].filter(Boolean).map((p: any) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select 
          value={locationFilter} 
          onChange={(e) => setLocationFilter(e.target.value)}
          className="clay-input appearance-none py-3"
        >
          <option value="All">All Locations</option>
          {[...new Set(servers.map(s => s.location))].filter(Boolean).map((l: any) => <option key={l} value={l}>{l}</option>)}
        </select>
        <button 
          onClick={() => {
            setSearchTerm('');
            setStatusFilter('All');
            setProviderFilter('All');
            setLocationFilter('All');
          }}
          className="clay-btn px-6 py-3"
        >
          Clear
        </button>
      </div>

      {/* Server Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServers.map((server) => (
          <div 
            key={server.id}
            className="clay-card group overflow-hidden border-none shadow-clay bg-brand-card hover:shadow-lg transition-all"
          >
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className={cn(
                  "p-3 rounded-2xl",
                  server.status === 'Online' ? "bg-emerald-500/10" : 
                  server.status === 'Offline' ? "bg-red-500/10" : "bg-amber-500/10"
                )}>
                  <Server className={cn(
                    "w-5 h-5",
                    server.status === 'Online' ? "text-emerald-500" : 
                    server.status === 'Offline' ? "text-red-500" : "text-amber-500"
                  )} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                    server.status === 'Online' ? "bg-emerald-500/10 text-emerald-600" : 
                    server.status === 'Offline' ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"
                  )}>
                    {server.status}
                  </span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingServer(server);
                        setValidationError('');
                        setFormData({
                          name: server.name,
                          url: server.url,
                          uptimeRobotUrl: server.uptimeRobotUrl || '',
                          location: server.location,
                          status: server.status,
                          ipAddress: server.ipAddress || '',
                          provider: server.provider || '',
                          notes: server.notes || ''
                        });
                        setIsAddModalOpen(true);
                      }}
                      className="p-1.5 text-brand-text-muted hover:text-brand-primary hover:bg-brand-bg rounded-lg transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(server.id);
                      }}
                      className="p-1.5 text-brand-text-muted hover:text-red-500 hover:bg-brand-bg rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <h3 
                  onClick={() => setSelectedServer(server)}
                  className="text-lg font-bold text-brand-text group-hover:text-brand-primary transition-colors cursor-pointer"
                >
                  {server.name}
                </h3>
                <a 
                  href={server.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-1.5 text-brand-text-muted hover:text-brand-primary hover:bg-brand-bg rounded-lg transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-brand-text-muted">
                  <Globe className="w-3.5 h-3.5 opacity-50" />
                  <span className="text-xs truncate">{server.uptimeRobotUrl || 'No Uptime URL'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-brand-text-muted">
                  <MapPin className="w-3.5 h-3.5 opacity-50" />
                  <span className="text-xs">{server.location}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-brand-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-brand-text-muted opacity-50" />
                  <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Uptime: 99.9%</span>
                </div>
                <div className="flex -space-x-1.5">
                  <div className="w-6 h-6 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center">
                    <Cpu className="w-3 h-3 text-brand-text-muted" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center">
                    <HardDrive className="w-3 h-3 text-brand-text-muted" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center">
                    <Shield className="w-3 h-3 text-brand-text-muted" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative clay-card w-full max-w-xl p-8 animate-in zoom-in-95 duration-200 border-none shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-brand-text">{editingServer ? 'Edit Server' : 'Add New Server'}</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-2 text-brand-text-muted hover:text-brand-text hover:bg-brand-bg rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {validationError && (
                <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-xs font-bold">
                  {validationError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Server Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Production API"
                    className="clay-input w-full py-3"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">URL</label>
                  <input 
                    required
                    type="url" 
                    value={formData.url}
                    onChange={(e) => setFormData({...formData, url: e.target.value})}
                    placeholder="https://example.com"
                    className="clay-input w-full py-3"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Uptime Robot URL</label>
                  <input 
                    type="url" 
                    value={formData.uptimeRobotUrl}
                    onChange={(e) => setFormData({...formData, uptimeRobotUrl: e.target.value})}
                    placeholder="https://stats.uptimerobot.com/..."
                    className="clay-input w-full py-3"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Location</label>
                  <input 
                    required
                    type="text" 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="e.g. Singapore (AWS)"
                    className="clay-input w-full py-3"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="clay-input w-full appearance-none py-3"
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">IP Address</label>
                  <input 
                    type="text" 
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({...formData, ipAddress: e.target.value})}
                    placeholder="e.g. 192.168.1.1"
                    className="clay-input w-full py-3"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Provider</label>
                  <input 
                    type="text" 
                    value={formData.provider}
                    onChange={(e) => setFormData({...formData, provider: e.target.value})}
                    placeholder="e.g. Amazon Web Services"
                    className="clay-input w-full py-3"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Notes</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional server details..."
                  rows={3}
                  className="clay-input w-full resize-none py-3"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="clay-btn flex-1 py-3"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="clay-btn-primary flex-1 py-3"
                >
                  {editingServer ? 'Update Server' : 'Add Server'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedServer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative clay-card w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-0 border-none shadow-2xl">
            <div className="h-32 bg-brand-primary/10 relative">
              <button 
                onClick={() => setSelectedServer(null)}
                className="absolute top-4 right-4 p-2 bg-brand-card hover:bg-brand-bg rounded-full text-brand-text-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute -bottom-10 left-8 p-4 bg-brand-card rounded-2xl border border-brand-border">
                <div className={cn(
                  "p-3 rounded-xl",
                  selectedServer.status === 'Online' ? "bg-emerald-500/10" : 
                  selectedServer.status === 'Offline' ? "bg-red-500/10" : "bg-amber-500/10"
                )}>
                  <Server className={cn(
                    "w-8 h-8",
                    selectedServer.status === 'Online' ? "text-emerald-500" : 
                    selectedServer.status === 'Offline' ? "text-red-500" : "text-amber-500"
                  )} />
                </div>
              </div>
            </div>

            <div className="p-8 pt-14">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-brand-text mb-1">{selectedServer.name}</h3>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                      selectedServer.status === 'Online' ? "bg-emerald-500/10 text-emerald-600" : 
                      selectedServer.status === 'Offline' ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"
                    )}>
                      {selectedServer.status}
                    </span>
                    <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">
                      ID: {selectedServer.id.substring(0, 8)}...
                    </span>
                  </div>
                </div>
                <a 
                  href={selectedServer.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="clay-btn px-5 py-2 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Visit
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-3">Network Info</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-brand-bg rounded-xl border border-brand-border">
                        <div className="flex items-center gap-2.5">
                          <Globe className="w-4 h-4 text-brand-text-muted opacity-50" />
                          <span className="text-xs font-bold text-brand-text">Uptime Robot</span>
                        </div>
                        <span className="text-xs text-brand-text-muted truncate max-w-[150px]">{selectedServer.uptimeRobotUrl || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-brand-bg rounded-xl border border-brand-border">
                        <div className="flex items-center gap-2.5">
                          <Shield className="w-4 h-4 text-brand-text-muted opacity-50" />
                          <span className="text-xs font-bold text-brand-text">IP Address</span>
                        </div>
                        <span className="text-xs text-brand-text-muted">{selectedServer.ipAddress || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-3">Infrastructure</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-brand-bg rounded-xl border border-brand-border">
                        <div className="flex items-center gap-2.5">
                          <MapPin className="w-4 h-4 text-brand-text-muted opacity-50" />
                          <span className="text-xs font-bold text-brand-text">Location</span>
                        </div>
                        <span className="text-xs text-brand-text-muted">{selectedServer.location}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-brand-bg rounded-xl border border-brand-border">
                        <div className="flex items-center gap-2.5">
                          <Activity className="w-4 h-4 text-brand-text-muted opacity-50" />
                          <span className="text-xs font-bold text-brand-text">Provider</span>
                        </div>
                        <span className="text-xs text-brand-text-muted">{selectedServer.provider || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-3">History</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-brand-bg rounded-xl border border-brand-border">
                        <div className="flex items-center gap-2.5">
                          <Clock className="w-4 h-4 text-brand-text-muted opacity-50" />
                          <span className="text-xs font-bold text-brand-text">Last Checked</span>
                        </div>
                        <span className="text-xs text-brand-text-muted">
                          {(() => {
                            if (!selectedServer.lastCheckedAt) return 'Never';
                            try {
                              return format(parseISO(selectedServer.lastCheckedAt), 'MMM d, HH:mm');
                            } catch (e) {
                              return 'Invalid Date';
                            }
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-brand-bg rounded-xl border border-brand-border">
                        <div className="flex items-center gap-2.5">
                          <Plus className="w-4 h-4 text-brand-text-muted opacity-50" />
                          <span className="text-xs font-bold text-brand-text">Added On</span>
                        </div>
                        <span className="text-xs text-brand-text-muted">
                          {(() => {
                            if (!selectedServer.createdAt) return 'N/A';
                            try {
                              return format(parseISO(selectedServer.createdAt), 'MMM d, yyyy');
                            } catch (e) {
                              return 'Invalid Date';
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedServer.notes && (
                    <div>
                      <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-3">Notes</p>
                      <div className="p-4 rounded-xl bg-brand-bg border border-brand-border text-xs text-brand-text-muted leading-relaxed italic">
                        "{selectedServer.notes}"
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
