import React from 'react';
import { FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface LogIssue {
  level: 'error' | 'warning' | 'info';
  message: string;
  count?: number;
}

interface LogRecommendation {
  category: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

interface LogAnalysisResult {
  summary: string;
  confidence: number;
  analyzedAt: string;
  issues: LogIssue[];
  recommendations: LogRecommendation[];
}

interface LogsTabProps {
  darkMode: boolean;
  logAnalysis?: LogAnalysisResult;
  isLoading: boolean;
}

export const LogsTab: React.FC<LogsTabProps> = ({ darkMode, logAnalysis, isLoading }) => {
  if (isLoading) {
    return (
      <div className="p-6">
        <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Log Analysis
        </h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className={`w-6 h-6 animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <span className={`ml-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Analyzing logs...
          </span>
        </div>
      </div>
    );
  }

  if (!logAnalysis) {
    return (
      <div className="p-6">
        <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Log Analysis
        </h3>
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No log analysis available</p>
        </div>
      </div>
    );
  }

  const hasContent = (logAnalysis.issues?.length || 0) > 0 || (logAnalysis.recommendations?.length || 0) > 0;

  return (
    <div className="p-6">
      <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Log Analysis
      </h3>
      
      {hasContent ? (
        <div className="space-y-6">
          {/* Issues */}
          {logAnalysis.issues?.length > 0 && (
            <div>
              <h4 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Issues Found
              </h4>
              <div className="space-y-2">
                {logAnalysis.issues.map((issue, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${
                    issue.level === 'error' 
                      ? darkMode ? 'bg-red-900/20 border-red-600/50' : 'bg-red-50 border-red-200'
                      : issue.level === 'warning'
                        ? darkMode ? 'bg-yellow-900/20 border-yellow-600/50' : 'bg-yellow-50 border-yellow-200'
                        : darkMode ? 'bg-blue-900/20 border-blue-600/50' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-start space-x-2">
                      <AlertCircle className={`w-4 h-4 mt-0.5 ${
                        issue.level === 'error' ? 'text-red-400' :
                        issue.level === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                      }`} />
                      <div className="flex-1">
                        <p className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {issue.message}
                        </p>
                        {issue.count && (
                          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Occurred {issue.count} times
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {logAnalysis.recommendations?.length > 0 && (
            <div>
              <h4 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Recommendations
              </h4>
              <div className="space-y-2">
                {logAnalysis.recommendations.map((rec, index) => (
                  <div key={index} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-400" />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {rec.category}
                        </p>
                        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {rec.suggestion}
                        </p>
                        <span className={`inline-block px-2 py-1 mt-2 text-xs rounded-full ${
                          rec.priority === 'high'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : rec.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        }`}>
                          {rec.priority} priority
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No issues or recommendations found</p>
        </div>
      )}
    </div>
  );
};
