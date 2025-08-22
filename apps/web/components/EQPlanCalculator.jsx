// EQ Plan Calculator Component
import React, { useState } from 'react';

const EQPlanCalculator = ({ darkMode = false }) => {
  const [targetDepth, setTargetDepth] = useState('');
  const [eqPlan, setEqPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculatePlan = async () => {
    if (!targetDepth) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/coach/eq-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDepth: parseInt(targetDepth) })
      });
      
      const result = await response.json();
      setEqPlan(result);
    } catch (error) {
      console.error('Error calculating EQ plan:', error);
    }
    setLoading(false);
  };

  return (
    <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
      <h3 className="text-xl font-bold mb-4">🎯 EQ Plan Calculator</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Target Depth (m)</label>
        <input
          type="number"
          value={targetDepth}
          onChange={(e) => setTargetDepth(e.target.value)}
          placeholder="Enter target depth"
          className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
        />
        <button
          onClick={calculatePlan}
          disabled={loading || !targetDepth}
          className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Calculating...' : 'Generate EQ Plan'}
        </button>
      </div>

      {eqPlan?.requiresInfo && (
        <div className="space-y-4">
          <div className={`p-4 rounded ${darkMode ? 'bg-amber-900/30 border border-amber-700' : 'bg-amber-50 border border-amber-200'}`}>
            <h4 className="font-semibold flex items-center">
              🎯 Let&apos;s Find Your Reverse Pack Depth
            </h4>
            <p className="mt-2 mb-3">{eqPlan.message}</p>
            
            {eqPlan.explanation && (
              <div className="mb-4">
                <h5 className="font-medium mb-2">Why This Matters:</h5>
                <p className="text-sm mb-2">{eqPlan.explanation.why}</p>
                <p className="text-sm">{eqPlan.explanation.whatIs}</p>
              </div>
            )}

            {eqPlan.testProtocol && (
              <div className="mb-4">
                <h5 className="font-medium mb-2">{eqPlan.guidance}</h5>
                <ul className="space-y-1 text-sm">
                  {eqPlan.testProtocol.instructions.map((instruction, i) => (
                    <li key={i} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
                
                {eqPlan.testProtocol.alternatives && (
                  <div className="mt-3">
                    <h6 className="font-medium text-sm mb-1">Alternative approaches:</h6>
                    <ul className="space-y-1 text-sm">
                      {eqPlan.testProtocol.alternatives.map((alt, i) => (
                        <li key={i} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{alt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {eqPlan.quickEstimate && (
              <div className={`p-3 rounded ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-300'}`}>
                <h5 className="font-medium mb-2">{eqPlan.quickEstimate.message}</h5>
                <p className="text-sm mb-1">{eqPlan.quickEstimate.assumptions}</p>
                <p className="text-sm font-medium">{eqPlan.quickEstimate.estimatedMouthfill}</p>
                <p className="text-xs mt-2 opacity-75">{eqPlan.quickEstimate.warning}</p>
              </div>
            )}

            <p className="mt-3 text-sm font-medium text-green-600 dark:text-green-400">
              {eqPlan.encouragement}
            </p>
          </div>
        </div>
      )}

      {eqPlan?.success && eqPlan.eqPlan && (
        <div className="space-y-4">
          <div className={`p-4 rounded ${darkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
            <h4 className="font-semibold">📊 Mouthfill Recommendation</h4>
            <p>Take {eqPlan.eqPlan.volumeRecommendation?.size || 'recommended volume'} at {eqPlan.eqPlan.mouthfillDepth}m</p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Theoretical max: {eqPlan.eqPlan.theoreticalMaxDepth}m 
              (Safety margin: {eqPlan.eqPlan.safetyMargin}m)
            </p>
          </div>

          <div className={`p-4 rounded ${darkMode ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'}`}>
            <h4 className="font-semibold">⚡ EQ Cadence Plan</h4>
            <p className="mb-2">Total EQs: {eqPlan.eqPlan.totalEQCount} (including surface EQ)</p>
            <ul className="space-y-1">
              {eqPlan.eqPlan.cadenceBands?.map((band, i) => (
                <li key={i} className="flex justify-between">
                  <span>{band.range}</span>
                  <span>EQ every {band.eqEvery || 'varies'} ({band.count} EQs)</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`p-4 rounded ${darkMode ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
            <h4 className="font-semibold">🛡️ CLEAR DIVE Safety Checklist</h4>
            <ul className="space-y-1">
              {eqPlan.clearDiveChecklist?.map((check, i) => (
                <li key={i} className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">{check}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`p-4 rounded ${darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
            <h4 className="font-semibold">💡 Koval&apos;s Notes</h4>
            <ul className="space-y-1">
              {eqPlan.eqPlan.notes?.map((note, i) => (
                <li key={i} className="text-sm">• {note}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {eqPlan?.requiresInfo && (
        <div className={`p-4 rounded ${darkMode ? 'bg-orange-900/30 border border-orange-700' : 'bg-orange-50 border border-orange-200'}`}>
          <h4 className="font-semibold">📋 Additional Information Needed</h4>
          <p className="mb-3">{eqPlan.message}</p>
          <p className="font-medium">{eqPlan.guidance}</p>
          
          {eqPlan.testProtocol && (
            <div className="mt-4">
              <h5 className="font-semibold mb-2">Test Protocol:</h5>
              <ul className="space-y-1">
                {eqPlan.testProtocol.instructions?.map((instruction, i) => (
                  <li key={i} className="text-sm">• {instruction}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EQPlanCalculator;
