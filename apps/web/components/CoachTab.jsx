// Coach Tab - Main container for all coaching tools
import React, { useState } from 'react';
import EQPlanCalculator from './EQPlanCalculator';

const CoachTab = ({ darkMode, setMessages }) => {
  const [activeCoachTool, setActiveCoachTool] = useState('eq-plan');

  const coachingTools = [
    { id: 'eq-plan', name: '🎯 EQ Plan Calculator', icon: '🎯' },
    { id: 'enclose', name: '🩺 ENCLOSE Diagnostic', icon: '🩺' },
    { id: 'clear-dive', name: '🛡️ CLEAR DIVE Safety', icon: '🛡️' },
    { id: 'mouthfill', name: '💨 Mouthfill Advisor', icon: '💨' },
    { id: 'training-plan', name: '📅 Training Plan', icon: '📅' }
  ];

  const renderActiveTool = () => {
    switch (activeCoachTool) {
      case 'eq-plan':
        return <EQPlanCalculator darkMode={darkMode} />;
      case 'enclose':
        return <ENCLOSEDiagnostic darkMode={darkMode} setMessages={setMessages} />;
      case 'clear-dive':
        return <ClearDiveChecklist darkMode={darkMode} />;
      case 'mouthfill':
        return <MouthfillAdvisor darkMode={darkMode} />;
      case 'training-plan':
        return <TrainingPlanGenerator darkMode={darkMode} setMessages={setMessages} />;
      default:
        return <EQPlanCalculator darkMode={darkMode} />;
    }
  };

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Coach Tab Header */}
      <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h2 className="text-xl font-bold mb-2">🧠 Koval Deep AI Coach</h2>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Advanced freediving coaching tools based on Daniel Koval&apos;s methodology
        </p>
      </div>

      {/* Tool Navigation */}
      <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex flex-wrap gap-2">
          {coachingTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveCoachTool(tool.id)}
              className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                activeCoachTool === tool.id
                  ? darkMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tool.icon} {tool.name}
            </button>
          ))}
        </div>
      </div>

      {/* Active Tool Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderActiveTool()}
      </div>
    </div>
  );
};

// Placeholder components - to be implemented
const ENCLOSEDiagnostic = ({ darkMode, setMessages }) => (
  <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
    <h3 className="text-lg font-bold mb-4">🩺 E.N.C.L.O.S.E. Diagnostic System</h3>
    <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
      Systematic evaluation of dive performance issues using Daniel&apos;s framework:
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[
        { key: 'E', title: 'Equalization Issues', desc: 'EQ failure, tension, mouthfill problems' },
        { key: 'N', title: 'Nitrogen Narcosis', desc: 'Depth >35m, tunnel vision, confusion' },
        { key: 'C', title: 'CO₂ Tolerance', desc: 'Early contractions, urge to breathe' },
        { key: 'L', title: 'Lung/Thoracic Issues', desc: 'Squeeze, chest pressure, breathing' },
        { key: 'O', title: 'O₂ Conservation', desc: 'Early blackout, inefficient technique' },
        { key: 'S', title: 'Streamlining/Technique', desc: 'Poor form, excess movement' },
        { key: 'E', title: 'Equipment Issues', desc: 'Mask, fins, suit, weights' }
      ].map((item) => (
        <div key={item.key} className={`p-3 rounded border ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'}`}>
          <h4 className="font-semibold">{item.key} - {item.title}</h4>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.desc}</p>
        </div>
      ))}
    </div>
    <button 
      onClick={() => setMessages(prev => [...prev, { role: 'user', content: 'I need help with ENCLOSE diagnostic' }])}
      className={`mt-4 px-4 py-2 rounded ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
    >
      Start ENCLOSE Analysis
    </button>
  </div>
);

const ClearDiveChecklist = ({ darkMode }) => (
  <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
    <h3 className="text-lg font-bold mb-4">🛡️ CLEAR DIVE Safety Protocol</h3>
    <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
      Daniel&apos;s comprehensive safety checklist. Check all before proceeding deeper:
    </p>
    {[
      'C - Contractions timing ≥ ⅓ of planned dive time?',
      'L - Legs calm on descent, no early burn?',
      'E - Equalization smooth and repeatable?',
      'A - Any O₂ symptoms (tunnel vision, stars) absent?',
      'R - Rising doubts or distraction absent?',
      'D - Discomfort in chest/throat absent?',
      'I - Impairment from narcosis absent?',
      'V - Vision clear, no distortion?',
      'E - Equipment fully functional?'
    ].map((check, i) => (
      <label key={i} className={`flex items-center mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <input type="checkbox" className="mr-3" />
        <span>{check}</span>
      </label>
    ))}
  </div>
);

const MouthfillAdvisor = ({ darkMode }) => (
  <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
    <h3 className="text-lg font-bold mb-4">💨 Mouthfill Advisor</h3>
    <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
      Personalized mouthfill recommendations based on Daniel&apos;s depth × volume multiplier theory.
    </p>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Current Reverse Pack Depth (m)</label>
        <input type="number" placeholder="e.g., 40" className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Mouthfill Size</label>
        <select className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
          <option>¼ full (grape size)</option>
          <option>½ full (ideal for beginners)</option>
          <option>¾ full (intermediate)</option>
          <option>Full (advanced only)</option>
        </select>
      </div>
      <button className={`px-4 py-2 rounded ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}>
        Calculate Optimal Mouthfill
      </button>
    </div>
  </div>
);

const TrainingPlanGenerator = ({ darkMode, setMessages }) => (
  <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
    <h3 className="text-lg font-bold mb-4">📅 Training Plan Generator</h3>
    <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
      Generate personalized training plans based on your goals and current level.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-2">Current PB Depth (m)</label>
        <input type="number" placeholder="e.g., 35" className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Goal Depth (m)</label>
        <input type="number" placeholder="e.g., 50" className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Training Days/Week</label>
        <select className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
          <option>2 days</option>
          <option>3 days</option>
          <option>4 days</option>
          <option>5+ days</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Primary Issue</label>
        <select className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
          <option>Equalization</option>
          <option>Mouthfill technique</option>
          <option>CO₂ tolerance</option>
          <option>Relaxation</option>
          <option>Streamlining</option>
        </select>
      </div>
    </div>
    <button 
      onClick={() => setMessages(prev => [...prev, { role: 'user', content: 'Generate a personalized training plan for me' }])}
      className={`mt-4 px-4 py-2 rounded ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
    >
      Generate Training Plan
    </button>
  </div>
);

export default CoachTab;
