import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api-client';

const ApiConnectionTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testApiConnection = async () => {
    setLoading(true);
    setTestResult('Testing API connection...');
    try {
      // Test basic connectivity
      const response = await apiClient.getServices();
      // Show a success message with limited information
      setTestResult(`✅ API Connected: ${response.length} services found`);
    } catch (error: unknown) {
      // Properly type and handle the error
      if (error instanceof Error) {
        setTestResult(`❌ API Error: ${error.message}`);
      } else {
        setTestResult(`❌ API Error: An unknown error occurred`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testApiConnection();
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg mb-4">
      <h3 className="text-lg font-medium mb-2">API Connection Test</h3>
      <button 
        onClick={testApiConnection}
        disabled={loading}
        className="btn-secondary mb-2"
      >
        {loading ? 'Testing...' : 'Test API'}
      </button>
      <pre className="text-sm bg-white p-2 rounded border">{testResult}</pre>
    </div>
  );
};

export { ApiConnectionTest };
export default ApiConnectionTest;