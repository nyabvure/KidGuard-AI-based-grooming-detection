import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, AlertTriangle, CheckCircle, Clock, LogOut, Wifi } from "lucide-react";
import IncidentList from "../components/incidents/IncidentList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { getParentId, clearAuth, authAxios } from "../lib/auth";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const POLL_INTERVAL = 5000; // ms

export default function Dashboard() {
  const navigate = useNavigate();
  const [parentId] = useState(() => getParentId());
  const [parent, setParent] = useState(null);
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newIncidentIds, setNewIncidentIds] = useState(new Set());
  const [liveStatus, setLiveStatus] = useState('connecting'); // connecting | live | error

  const knownIdsRef = useRef(new Set());
  const pollingRef = useRef(null);

  useEffect(() => {
    if (!parentId) navigate('/login');
  }, [parentId, navigate]);

  useEffect(() => {
    if (parentId) loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const parentRes = await authAxios.get(`${API}/parents/${parentId}`);
      setParent(parentRes.data);

      const statsRes = await authAxios.get(`${API}/stats?parentId=${parentId}`);
      setStats(statsRes.data);

      const incidentsRes = await authAxios.get(`${API}/incidents?parentId=${parentId}`);
      const initial = [...incidentsRes.data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setIncidents(initial);

      // Seed knownIds with everything we already have
      initial.forEach(inc => knownIdsRef.current.add(inc.id));

      setLoading(false);
      setLiveStatus('live');
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error("Failed to load dashboard");
      setLoading(false);
      setLiveStatus('error');
    }
  };

  // ── Live polling ──────────────────────────────────────────────────────────
  const pollForNewIncidents = useCallback(async () => {
    try {
      const [incidentsRes, statsRes] = await Promise.all([
        authAxios.get(`${API}/incidents?parentId=${parentId}`),
        authAxios.get(`${API}/stats?parentId=${parentId}`),
      ]);

      const fresh = [...incidentsRes.data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const brandNew = fresh.filter(inc => !knownIdsRef.current.has(inc.id));

      if (brandNew.length > 0) {
        fresh.forEach(inc => knownIdsRef.current.add(inc.id));
        setIncidents(fresh);
        setStats(statsRes.data);

        // Highlight the new ones
        const newIds = new Set(brandNew.map(inc => inc.id));
        setNewIncidentIds(newIds);
        setTimeout(() => setNewIncidentIds(new Set()), 6000);

        // Toast per new incident
        brandNew.forEach(inc => {
          if (inc.riskLevel === 'high') {
            toast.error(`🚨 HIGH RISK alert — "${inc.message.substring(0, 45)}..."`, {
              duration: 8000,
            });
          } else if (inc.riskLevel === 'medium') {
            toast.warning(`⚠️ Medium risk alert detected`, { duration: 5000 });
          } else {
            toast.info(`New low-risk incident detected`, { duration: 3000 });
          }
        });
      }

      setLiveStatus('live');
    } catch (err) {
      console.debug('Poll error:', err);
      setLiveStatus('error');
    }
  }, [parentId]);

  // Start polling once initial load is done
  useEffect(() => {
    if (loading) return;
    pollingRef.current = setInterval(pollForNewIncidents, POLL_INTERVAL);
    return () => clearInterval(pollingRef.current);
  }, [loading, pollForNewIncidents]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleIncidentReview = async (incidentId) => {
    try {
      await authAxios.patch(`${API}/incidents/${incidentId}/review`);
      setIncidents(prev => prev.map(inc =>
        inc.id === incidentId ? { ...inc, reviewed: true } : inc
      ));
      toast.success("Incident marked as reviewed");
    } catch (error) {
      console.error('Error reviewing incident:', error);
      toast.error("Failed to mark as reviewed");
    }
  };

  const handleIncidentDelete = async (incidentId) => {
    try {
      await authAxios.delete(`${API}/incidents/${incidentId}`);
      setIncidents(prev => prev.filter(inc => inc.id !== incidentId));
      const statsRes = await authAxios.get(`${API}/stats?parentId=${parentId}`);
      setStats(statsRes.data);
      toast.success("Incident deleted");
    } catch (error) {
      console.error('Error deleting incident:', error);
      toast.error("Failed to delete incident");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-10 h-10 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">KidGuard</h1>
                <p className="text-sm text-gray-600">Child Online Protection Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Live indicator */}
              <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border"
                style={liveStatus === 'live'
                  ? { color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }
                  : liveStatus === 'error'
                  ? { color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }
                  : { color: '#9ca3af', borderColor: '#e5e7eb', background: '#f9fafb' }}>
                <span style={{
                  display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                  background: liveStatus === 'live' ? '#16a34a' : liveStatus === 'error' ? '#dc2626' : '#9ca3af',
                  animation: liveStatus === 'live' ? 'kidguard-pulse 2s infinite' : 'none'
                }} />
                {liveStatus === 'live' ? 'Live' : liveStatus === 'error' ? 'Offline' : 'Connecting'}
              </div>

              {parent && (
                <div className="text-right" data-testid="parent-info">
                  <p className="text-sm font-medium text-gray-900">{parent.name}</p>
                  <p className="text-xs text-gray-500">{parent.phone}</p>
                  <p className="text-xs text-blue-600 mt-1">ID: {parentId.substring(0, 8)}...</p>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" data-testid="stats-section">
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">High Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-red-600" data-testid="high-risk-count">{stats.highRisk}</span>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Medium Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-orange-600" data-testid="medium-risk-count">{stats.mediumRisk}</span>
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Low Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-yellow-600" data-testid="low-risk-count">{stats.lowRisk}</span>
                  <CheckCircle className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-blue-600" data-testid="total-incidents-count">{stats.totalIncidents}</span>
                  <Shield className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Incidents List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Incidents</CardTitle>
                <CardDescription>Monitor detected grooming risk patterns · updates every 5 s</CardDescription>
              </div>
              {newIncidentIds.size > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full animate-bounce"
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                  {newIncidentIds.size} new alert{newIncidentIds.size > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <IncidentList
              incidents={incidents}
              onReview={handleIncidentReview}
              onDelete={handleIncidentDelete}
              newIncidentIds={newIncidentIds}
            />
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Chrome Extension Setup</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800">
            <ol className="list-decimal list-inside space-y-2">
              <li>Install the KidGuard Chrome extension</li>
              <li>Click the extension icon and enter your Parent ID: <code className="bg-blue-100 px-2 py-1 rounded">{parentId}</code></li>
              <li>Enter your child's name</li>
              <li>The extension will monitor Roblox chat automatically</li>
              <li>You'll receive SMS alerts for high-risk incidents</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
