import React from 'react';

// Rule of Nines Values
const REGION_VALUES: Record<string, number> = {
  'head-front': 4.5,
  'head-back': 4.5,
  'torso-front-upper': 9, // Chest
  'torso-front-lower': 9, // Abdomen
  'torso-back-upper': 9,  // Upper Back
  'torso-back-lower': 9,  // Lower Back
  'arm-left-front': 4.5,
  'arm-left-back': 4.5,
  'arm-right-front': 4.5,
  'arm-right-back': 4.5,
  'leg-left-front': 9,
  'leg-left-back': 9,
  'leg-right-front': 9,
  'leg-right-back': 9,
  'genitals': 1,
};

interface BodyMapProps {
  selectedRegions: string[];
  onChange?: (regions: string[]) => void;
  readOnly?: boolean;
}

export const BodyMap: React.FC<BodyMapProps> = ({ selectedRegions, onChange, readOnly = false }) => {
  
  const toggleRegion = (id: string) => {
    if (readOnly || !onChange) return;
    
    if (selectedRegions.includes(id)) {
      onChange(selectedRegions.filter(r => r !== id));
    } else {
      onChange([...selectedRegions, id]);
    }
  };

  const getFill = (id: string) => {
    if (selectedRegions.includes(id)) {
      // Return a burn color (red/orange)
      return '#ef4444'; 
    }
    // Return neutral color
    return '#e5e7eb';
  };

  const getHoverClass = () => {
    return readOnly ? '' : 'cursor-pointer hover:opacity-80 transition-opacity';
  };

  return (
    <div className="flex flex-col sm:flex-row gap-8 justify-center items-center py-4 select-none">
      
      {/* FRONT VIEW */}
      <div className="flex flex-col items-center">
        <span className="text-sm font-semibold text-gray-500 mb-2">Anterior (Front)</span>
        <svg width="150" height="350" viewBox="0 0 200 450" className="drop-shadow-sm">
          {/* Head Front */}
          <path
            d="M85 30 Q100 0 115 30 L115 50 Q100 60 85 50 Z"
            fill={getFill('head-front')}
            stroke="#9ca3af"
            strokeWidth="1"
            className={getHoverClass()}
            onClick={() => toggleRegion('head-front')}
          />
          <text x="100" y="40" fontSize="10" textAnchor="middle" fill="#374151" pointerEvents="none">4.5%</text>

          {/* Chest (Torso Upper Front) */}
          <path
            d="M70 60 L130 60 L125 120 L75 120 Z"
            fill={getFill('torso-front-upper')}
            stroke="#9ca3af"
            strokeWidth="1"
            className={getHoverClass()}
            onClick={() => toggleRegion('torso-front-upper')}
          />
           <text x="100" y="95" fontSize="10" textAnchor="middle" fill="#374151" pointerEvents="none">9%</text>

          {/* Abdomen (Torso Lower Front) */}
          <path
            d="M75 120 L125 120 L125 170 L75 170 Z"
            fill={getFill('torso-front-lower')}
            stroke="#9ca3af"
            strokeWidth="1"
            className={getHoverClass()}
            onClick={() => toggleRegion('torso-front-lower')}
          />
          <text x="100" y="150" fontSize="10" textAnchor="middle" fill="#374151" pointerEvents="none">9%</text>

          {/* Left Arm Front (Viewer's Left, Patient's Right) */}
          <path
            d="M70 60 L50 150 L65 150 L75 70 Z"
            fill={getFill('arm-right-front')}
            stroke="#9ca3af"
            strokeWidth="1"
            className={getHoverClass()}
            onClick={() => toggleRegion('arm-right-front')}
          />
           <text x="55" y="110" fontSize="10" textAnchor="middle" fill="#374151" pointerEvents="none">4.5%</text>

          {/* Right Arm Front (Viewer's Right, Patient's Left) */}
          <path
            d="M130 60 L150 150 L135 150 L125 70 Z"
            fill={getFill('arm-left-front')}
            stroke="#9ca3af"
            strokeWidth="1"
            className={getHoverClass()}
            onClick={() => toggleRegion('arm-left-front')}
          />
          <text x="145" y="110" fontSize="10" textAnchor="middle" fill="#374151" pointerEvents="none">4.5%</text>

          {/* Genitals */}
          <path
            d="M95 170 L105 170 L100 185 Z"
            fill={getFill('genitals')}
            stroke="#9ca3af"
            strokeWidth="1"
            className={getHoverClass()}
            onClick={() => toggleRegion('genitals')}
          />
          <text x="100" y="195" fontSize="8" textAnchor="middle" fill="#374151" pointerEvents="none">1%</text>

          {/* Left Leg Front */}
          <path
            d="M75 170 L95 170 L95 185 L90 300 L65 300 Z"
            fill={getFill('leg-right-front')}
            stroke="#9ca3af"
            strokeWidth="1"
            className={getHoverClass()}
            onClick={() => toggleRegion('leg-right-front')}
          />
          <text x="80" y="240" fontSize="10" textAnchor="middle" fill="#374151" pointerEvents="none">9%</text>

          {/* Right Leg Front */}
          <path
            d="M105 170 L125 170 L135 300 L110 300 L105 185 Z"
            fill={getFill('leg-left-front')}
            stroke="#9ca3af"
            strokeWidth="1"
            className={getHoverClass()}
            onClick={() => toggleRegion('leg-left-front')}
          />
          <text x="120" y="240" fontSize="10" textAnchor="middle" fill="#374151" pointerEvents="none">9%</text>
        </svg>
      </div>

      {/* BACK VIEW */}
      <div className="flex flex-col items-center">
        <span className="text-sm font-semibold text-gray-500 mb-2">Posterior (Back)</span>
        <svg width="150" height="350" viewBox="0 0 200 450" className="drop-shadow-sm">
          {/* Head Back */}
          <path
            d="M85 30 Q100 0 115 30 L115 50 Q100 60 85 50 Z"
            fill={getFill('head-back')}
            stroke="#9ca3af"
            strokeWidth="1"
            className={getHoverClass()}
            onClick={() => toggleRegion('head-back')}
          />
          <text x="100" y="40" fontSize="10" textAnchor="middle" fill="#374151" pointerEvents="none">4.5%</text>

          {/* Upper Back */}
          <path
            d="M70 60 L130 60 L125 120 L75 120 Z"
            fill={getFill('torso-back-upper')}
            stroke="#9ca3af"
            strokeWidth="1"
            className={getHoverClass()}
            onClick={() => toggleRegion('torso-back-upper')}
          />
          <text x="100" y="95" fontSize="10" textAnchor="middle" fill="#374151" pointerEvents="none">9%</text>

          {/* Lower Back */}
          <path
            d="M75 120 L125 120 L125 170 L75 170 Z"
            fill={getFill('torso-back-lower')}
            stroke="#9ca3af"
            strokeWidth="1"
            className={getHoverClass()}
            onClick={() => toggleRegion('torso-back-lower')}
          />
          <text x="100" y="150" fontSize="10" textAnchor="middle" fill="#374151" pointerEvents="none">9%</text>

          {/* Left Arm Back */}
          <path
            d="M70 60 L50 150 L65 150 L75 70 Z"
            fill={getFill('arm-left-back')} // Note: on back view, left is left arm (anatomically left)
            stroke="#9ca3af"
            strokeWidth="1"
            className={getHoverClass()}
            onClick={() => toggleRegion('arm-left-back')}
          />
          <text x="55" y="110" fontSize="10" textAnchor="middle" fill="#374151" pointerEvents="none">4.5%</text>

          {/* Right Arm Back */}
          <path
            d="M130 60 L150 150 L135 150 L125 70 Z"
            fill={getFill('arm-right-back')}
            stroke="#9ca3af"
            strokeWidth="1"
            className={getHoverClass()}
            onClick={() => toggleRegion('arm-right-back')}
          />
          <text x="145" y="110" fontSize="10" textAnchor="middle" fill="#374151" pointerEvents="none">4.5%</text>

          {/* Left Leg Back */}
          <path
            d="M75 170 L95 170 L95 185 L90 300 L65 300 Z"
            fill={getFill('leg-left-back')}
            stroke="#9ca3af"
            strokeWidth="1"
            className={getHoverClass()}
            onClick={() => toggleRegion('leg-left-back')}
          />
          <text x="80" y="240" fontSize="10" textAnchor="middle" fill="#374151" pointerEvents="none">9%</text>

          {/* Right Leg Back */}
          <path
            d="M105 170 L125 170 L135 300 L110 300 L105 185 Z"
            fill={getFill('leg-right-back')}
            stroke="#9ca3af"
            strokeWidth="1"
            className={getHoverClass()}
            onClick={() => toggleRegion('leg-right-back')}
          />
          <text x="120" y="240" fontSize="10" textAnchor="middle" fill="#374151" pointerEvents="none">9%</text>
        </svg>
      </div>
    </div>
  );
};

export const calculateTBSA = (selectedRegions: string[]): number => {
  return selectedRegions.reduce((total, region) => total + (REGION_VALUES[region] || 0), 0);
};