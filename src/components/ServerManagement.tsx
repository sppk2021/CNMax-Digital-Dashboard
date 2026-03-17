import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { format, parseISO } from 'date-fns';
import { cn } from '../utils';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';

// Simple mapping of location names to [longitude, latitude]
const locationCoords: { [key: string]: [number, number] } = {
  'Singapore': [103.8198, 1.3521],
  'US-East': [-77.0369, 38.9072],
  'US-West': [-118.2437, 34.0522],
  'London': [-0.1278, 51.5074],
  'Tokyo': [139.6917, 35.6895],
  'Frankfurt': [8.6821, 50.1109],
};

interface Server {
  id: string;
  name: string;
  url: string;
  uptimeRobotUrl?: string;
  location: string;
  status: 'Online' | 'Offline' | 'Maintenance';
  ipAddress?: string;
  provider?: string;
  notes?: string;
  createdAt: string;
  lastCheckedAt: string;
}

interface ServerManagementProps {
  servers: Server[];
}

export function ServerManagement({ servers }: ServerManagementProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [providerFilter, setProviderFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingServer) {
        await updateDoc(doc(db, 'servers', editingServer.id), {
          ...formData,
          lastCheckedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'servers'), {
          ...formData,
          createdAt: new Date().toISOString(),
          lastCheckedAt: new Date().toISOString()
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
    } catch (error) {
      console.error('Error saving server:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this server?')) {
      try {
        await deleteDoc(doc(db, 'servers', id));
      } catch (error) {
        console.error('Error deleting server:', error);
      }
    }
  };

  const checkServerStatus = async (server: any) => {
    try {
      // Note: 'no-cors' mode means we can't read the response status, 
      // but if the request completes, we assume it's reachable.
      // A more robust solution would require a server-side proxy.
      await fetch(server.url, { method: 'HEAD', mode: 'no-cors' });
      await updateDoc(doc(db, 'servers', server.id), {
        status: 'Online',
        lastCheckedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking server:', error);
      await updateDoc(doc(db, 'servers', server.id), {
        status: 'Offline',
        lastCheckedAt: new Date().toISOString()
      });
    }
  };

  const checkAllServers = async () => {
    for (const server of servers) {
      await checkServerStatus(server);
    }
  };

  const filteredServers = servers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    const matchesProvider = providerFilter === 'All' || s.provider === providerFilter;
    const matchesLocation = locationFilter === 'All' || s.location === locationFilter;
    return matchesSearch && matchesStatus && matchesProvider && matchesLocation;
  });

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Server Monitoring</h2>
          <p className="text-slate-500">Manage and monitor your infrastructure status.</p>
        </div>
        <button 
          onClick={() => {
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
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 bg-brand-sidebar hover:bg-brand-blue text-white px-6 py-3 rounded-2xl shadow-lg shadow-brand-sidebar/20 transition-all font-bold"
        >
          <Plus className="w-5 h-5" />
          Add Server
        </button>
        <button 
          onClick={checkAllServers}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-2xl transition-all font-bold"
        >
          <Activity className="w-5 h-5" />
          Refresh Status
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Online</p>
              <h3 className="text-2xl font-black text-slate-800">
                {servers.filter(s => s.status === 'Online').length}
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-50 rounded-xl">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Offline</p>
              <h3 className="text-2xl font-black text-slate-800">
                {servers.filter(s => s.status === 'Offline').length}
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Maintenance</p>
              <h3 className="text-2xl font-black text-slate-800">
                {servers.filter(s => s.status === 'Maintenance').length}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* World Map */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Server Locations</h3>
        <ComposableMap projection="geoMercator" height={300}>
          <ZoomableGroup zoom={1}>
            <Geographies geography="/features.json">
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography key={geo.rsmKey} geography={geo} fill="#E2E8F0" stroke="#FFF" />
                ))
              }
            </Geographies>
            {servers.map((server) => {
              const coords = locationCoords[server.location];
              if (!coords) return null;
              return (
                <Marker key={server.id} coordinates={coords}>
                  <circle r={6} fill={server.status === 'Online' ? '#10B981' : '#EF4444'} />
                  <text textAnchor="middle" y={-10} style={{ fontSize: '10px', fill: '#475569' }}>
                    {server.name}
                  </text>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search servers by name, location or URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-sidebar/20 shadow-sm transition-all"
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-sidebar/20 shadow-sm"
        >
          <option value="All">All Statuses</option>
          <option value="Online">Online</option>
          <option value="Offline">Offline</option>
          <option value="Maintenance">Maintenance</option>
        </select>
        <select 
          value={providerFilter} 
          onChange={(e) => setProviderFilter(e.target.value)}
          className="px-4 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-sidebar/20 shadow-sm"
        >
          <option value="All">All Providers</option>
          {[...new Set(servers.map(s => s.provider))].filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select 
          value={locationFilter} 
          onChange={(e) => setLocationFilter(e.target.value)}
          className="px-4 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-sidebar/20 shadow-sm"
        >
          <option value="All">All Locations</option>
          {[...new Set(servers.map(s => s.location))].filter(Boolean).map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <button 
          onClick={() => {
            setSearchTerm('');
            setStatusFilter('All');
            setProviderFilter('All');
            setLocationFilter('All');
          }}
          className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all font-bold"
        >
          Clear
        </button>
      </div>

      {/* Server Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredServers.map((server) => (
          <div 
            key={server.id}
            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className={cn(
                  "p-4 rounded-2xl",
                  server.status === 'Online' ? "bg-emerald-50" : 
                  server.status === 'Offline' ? "bg-red-50" : "bg-amber-50"
                )}>
                  <Server className={cn(
                    "w-6 h-6",
                    server.status === 'Online' ? "text-emerald-500" : 
                    server.status === 'Offline' ? "text-red-500" : "text-amber-500"
                  )} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    server.status === 'Online' ? "bg-emerald-100 text-emerald-600" : 
                    server.status === 'Offline' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                  )}>
                    {server.status}
                  </span>
                  <div className="relative group/menu">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingServer(server);
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
                      className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-slate-400" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(server.id);
                      }}
                      className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <h3 
                  onClick={() => setSelectedServer(server)}
                  className="text-xl font-bold text-slate-800 group-hover:text-brand-sidebar transition-colors cursor-pointer"
                >
                  {server.name}
                </h3>
                <a 
                  href={server.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-brand-sidebar hover:text-brand-blue transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-500">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm truncate">{server.uptimeRobotUrl || 'No Uptime URL'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{server.location}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-300" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Uptime: 99.9%</span>
                </div>
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
                    <Cpu className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
                    <HardDrive className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
                    <Shield className="w-3 h-3 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-slate-800">{editingServer ? 'Edit Server' : 'Add New Server'}</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Server Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Production API"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-sidebar/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Uptime Robot URL</label>
                  <input 
                    type="url" 
                    value={formData.uptimeRobotUrl}
                    onChange={(e) => setFormData({...formData, uptimeRobotUrl: e.target.value})}
                    placeholder="https://stats.uptimerobot.com/..."
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-sidebar/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Location</label>
                  <input 
                    required
                    type="text" 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="e.g. Singapore (AWS)"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-sidebar/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-sidebar/20 transition-all appearance-none"
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">IP Address</label>
                  <input 
                    type="text" 
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({...formData, ipAddress: e.target.value})}
                    placeholder="e.g. 192.168.1.1"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-sidebar/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Provider</label>
                  <input 
                    type="text" 
                    value={formData.provider}
                    onChange={(e) => setFormData({...formData, provider: e.target.value})}
                    placeholder="e.g. Amazon Web Services"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-sidebar/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Notes</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional server details..."
                  rows={3}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-sidebar/20 transition-all resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 bg-brand-sidebar hover:bg-brand-blue text-white font-bold rounded-2xl shadow-lg shadow-brand-sidebar/20 transition-all"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedServer(null)} />
          <div className="relative bg-white w-full max-w-3xl rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-300">
            <div className="h-48 bg-brand-sidebar relative">
              <button 
                onClick={() => setSelectedServer(null)}
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="absolute -bottom-12 left-12 p-6 bg-white rounded-[2rem] shadow-xl border border-slate-100">
                <div className={cn(
                  "p-4 rounded-2xl",
                  selectedServer.status === 'Online' ? "bg-emerald-50" : 
                  selectedServer.status === 'Offline' ? "bg-red-50" : "bg-amber-50"
                )}>
                  <Server className={cn(
                    "w-10 h-10",
                    selectedServer.status === 'Online' ? "text-emerald-500" : 
                    selectedServer.status === 'Offline' ? "text-red-500" : "text-amber-500"
                  )} />
                </div>
              </div>
            </div>

            <div className="p-12 pt-20">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-3xl font-black text-slate-800 mb-2">{selectedServer.name}</h3>
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest",
                      selectedServer.status === 'Online' ? "bg-emerald-100 text-emerald-600" : 
                      selectedServer.status === 'Offline' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                    )}>
                      {selectedServer.status}
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      ID: {selectedServer.id}
                    </span>
                  </div>
                </div>
                <a 
                  href={selectedServer.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-bold transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Visit URL
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Network Info</p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <Globe className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-bold text-slate-600">Uptime Robot</span>
                        </div>
                        <span className="text-sm font-medium text-slate-800 truncate max-w-[200px]">{selectedServer.uptimeRobotUrl || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <Shield className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-bold text-slate-600">IP Address</span>
                        </div>
                        <span className="text-sm font-medium text-slate-800">{selectedServer.ipAddress || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Infrastructure</p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-bold text-slate-600">Location</span>
                        </div>
                        <span className="text-sm font-medium text-slate-800">{selectedServer.location}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <Activity className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-bold text-slate-600">Provider</span>
                        </div>
                        <span className="text-sm font-medium text-slate-800">{selectedServer.provider || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">History</p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-bold text-slate-600">Last Checked</span>
                        </div>
                        <span className="text-sm font-medium text-slate-800">
                          {selectedServer.lastCheckedAt ? format(parseISO(selectedServer.lastCheckedAt), 'MMM d, HH:mm') : 'Never'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <Plus className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-bold text-slate-600">Added On</span>
                        </div>
                        <span className="text-sm font-medium text-slate-800">
                          {format(parseISO(selectedServer.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedServer.notes && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Notes</p>
                      <div className="p-6 bg-slate-50 rounded-2xl italic text-slate-600 text-sm leading-relaxed">
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
