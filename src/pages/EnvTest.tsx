const EnvTest = () => {
  const envVars = import.meta.env;
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Test</h1>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-semibold mb-2">All Environment Variables:</h2>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(envVars, null, 2)}
        </pre>
      </div>
      
      <div className="mt-4 bg-blue-100 p-4 rounded">
        <h2 className="font-semibold mb-2">Google API Key Status:</h2>
        <p>Exists: {!!envVars.VITE_GOOGLE_API_KEY ? 'YES' : 'NO'}</p>
        <p>Length: {envVars.VITE_GOOGLE_API_KEY?.length || 0}</p>
        <p>First 10 chars: {envVars.VITE_GOOGLE_API_KEY?.substring(0, 10) || 'N/A'}</p>
      </div>
      
      <div className="mt-4 bg-green-100 p-4 rounded">
        <h2 className="font-semibold mb-2">Supabase Config:</h2>
        <p>URL: {envVars.VITE_SUPABASE_URL || 'NOT SET'}</p>
        <p>Key exists: {!!envVars.VITE_SUPABASE_ANON_KEY ? 'YES' : 'NO'}</p>
      </div>
    </div>
  );
};

export default EnvTest;