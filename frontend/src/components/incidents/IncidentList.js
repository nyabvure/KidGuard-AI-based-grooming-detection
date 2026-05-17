import { useState } from "react";
import { AlertTriangle, CheckCircle, Clock, Eye, MessageSquare, MapPin, ChevronDown, ChevronUp, Brain, Trash2 } from "lucide-react";
import { Button } from "../ui/button";

export default function IncidentList({ incidents, onReview, onDelete, newIncidentIds = new Set() }) {
  const [showReviewed, setShowReviewed] = useState(false);

  if (!incidents || incidents.length === 0) {
    return (
      <div className="text-center py-12" data-testid="no-incidents">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Incidents Detected</h3>
        <p className="text-gray-600">Great news! No grooming risk patterns have been detected yet.</p>
      </div>
    );
  }

  const getRiskBadge = (level) => {
    const configs = {
      high: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: AlertTriangle },
      medium: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', icon: Clock },
      low: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', icon: AlertTriangle }
    };

    const config = configs[level] || configs.low;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}>
        <Icon className="w-3 h-3" />
        {level.toUpperCase()}
      </span>
    );
  };

  const getRiskBorderColor = (level) => {
    const colors = {
      high: 'border-l-red-500',
      medium: 'border-l-orange-400',
      low: 'border-l-yellow-400'
    };
    return colors[level] || colors.low;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(navigator.language, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  };

  const renderIncident = (incident) => {
    const isNew = newIncidentIds.has(incident.id);
    return (
    <div
      key={incident.id}
      data-testid={`incident-${incident.id}`}
      className={`border-l-4 rounded-lg p-4 transition-all ${getRiskBorderColor(incident.riskLevel)} ${
        incident.reviewed
          ? 'bg-gray-50 border border-gray-200 opacity-70'
          : 'bg-white border border-gray-200 shadow-sm'
      }`}
      style={isNew ? {
        animation: 'kidguard-slide-in 0.4s ease-out',
        boxShadow: '0 0 0 2px #ef4444, 0 4px 16px rgba(239,68,68,0.2)'
      } : {}}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {getRiskBadge(incident.riskLevel)}
          <span className="text-sm text-gray-500">{formatDate(incident.timestamp)}</span>
        </div>

        <div className="flex items-center gap-2">
          {!incident.reviewed ? (
            <Button
              data-testid={`review-btn-${incident.id}`}
              size="sm"
              variant="outline"
              onClick={() => onReview(incident.id)}
              className="text-xs"
            >
              <Eye className="w-3 h-3 mr-1" />
              Mark Reviewed
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full font-medium">
              <CheckCircle className="w-3 h-3" />
              Reviewed
            </span>
          )}
          <Button
            data-testid={`delete-btn-${incident.id}`}
            size="sm"
            variant="outline"
            onClick={() => onDelete(incident.id)}
            className="text-xs text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 mb-1">Message Content:</p>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
              "{incident.message}"
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Platform:</span>
            <span className="ml-2 font-medium text-gray-900">{incident.platform}</span>
          </div>
          <div>
            <span className="text-gray-500">Username:</span>
            <span className="ml-2 font-medium text-gray-900">{incident.username}</span>
          </div>
          <div>
            <span className="text-gray-500">Child:</span>
            <span className="ml-2 font-medium text-gray-900">{incident.childName}</span>
          </div>
          <div>
            <span className="text-gray-500">Risk Score:</span>
            <span className="ml-2 font-bold text-red-600">{incident.riskScore}</span>
          </div>
        </div>

        {incident.detectedPatterns && incident.detectedPatterns.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Detected Patterns:</p>
            <div className="flex flex-wrap gap-2">
              {incident.detectedPatterns.map((pattern, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs rounded border border-red-200"
                >
                  <AlertTriangle className="w-3 h-3" />
                  {pattern.category} (+{pattern.score})
                </span>
              ))}
            </div>
          </div>
        )}

        {incident.url && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="w-3 h-3" />
            <a
              href={incident.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 underline truncate"
            >
              {incident.url}
            </a>
          </div>
        )}

        {incident.conversationContext && incident.conversationContext.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Conversation Context
              <span className="ml-2 text-xs font-normal text-gray-400">
                ({incident.conversationContext.length} message{incident.conversationContext.length !== 1 ? 's' : ''} before incident)
              </span>
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded p-2 space-y-1 max-h-40 overflow-y-auto">
              {incident.conversationContext.map((msg, idx) => {
                const isIncident = msg.text === incident.message;
                return (
                  <div key={idx} className={`flex gap-2 text-xs px-2 py-1 rounded ${isIncident ? 'bg-red-50 border border-red-200' : ''}`}>
                    <span className="font-semibold text-gray-600 shrink-0">{msg.username}:</span>
                    <span className={isIncident ? 'text-red-700 font-medium' : 'text-gray-700'}>{msg.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {incident.aiLabel && (
          <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded ${
            incident.aiLabel === 'grooming'
              ? 'bg-purple-50 text-purple-800 border border-purple-200'
              : 'bg-gray-50 text-gray-600 border border-gray-200'
          }`}>
            <Brain className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              <span className="font-semibold">AI: </span>
              {incident.aiLabel.toUpperCase()}
              {incident.aiConfidence != null && (
                <span className="ml-1 opacity-70">({Math.round(incident.aiConfidence * 100)}% confident)</span>
              )}
              {incident.aiReason && (
                <span className="ml-1">— {incident.aiReason}</span>
              )}
            </span>
          </div>
        )}

        {incident.alertSent && (
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded">
            <CheckCircle className="w-4 h-4" />
            SMS alert sent to parent
          </div>
        )}
      </div>
    </div>
  );
  };

  const unreviewed = incidents.filter((i) => !i.reviewed);
  const reviewed = incidents.filter((i) => i.reviewed);

  return (
    <div className="space-y-6" data-testid="incidents-list">
      {/* Needs Review */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-800">Needs Review</h3>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
            {unreviewed.length}
          </span>
        </div>

        {unreviewed.length === 0 ? (
          <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-green-700 font-medium">All incidents reviewed</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unreviewed.map(renderIncident)}
          </div>
        )}
      </div>

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <div>
          <button
            onClick={() => setShowReviewed(!showReviewed)}
            className="flex items-center gap-2 w-full text-left mb-3 group"
          >
            <CheckCircle className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-semibold text-gray-500 group-hover:text-gray-700 transition-colors">
              Reviewed
            </h3>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
              {reviewed.length}
            </span>
            <span className="ml-auto text-gray-400 group-hover:text-gray-600 transition-colors">
              {showReviewed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>

          {showReviewed && (
            <div className="space-y-3">
              {reviewed.map(renderIncident)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
