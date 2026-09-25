import React from 'react';
import Svg, { Path, Circle, Rect, G, Defs, LinearGradient, Stop } from 'react-native-svg';

interface TreeIconProps {
  size?: number;
  color?: any;
  focused?: boolean;
}

/**
 * 🌳 TreeCanopyIcon — Sacred Banyan / Neem Sprawling Canopy
 * Used for Home & Brand insignia
 */
export const TreeCanopyIcon: React.FC<TreeIconProps> = ({
  size = 24,
  color = '#1B5E20',
  focused = false,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="canopyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={focused ? '#10B981' : color} />
          <Stop offset="100%" stopColor={focused ? '#047857' : color} />
        </LinearGradient>
      </Defs>
      {/* Root flares */}
      <Path
        d="M10 21C10 19 11 16 11 14H13C13 16 14 19 14 21H10Z"
        fill={color}
        opacity={0.85}
      />
      <Path
        d="M8.5 21C9.2 19.5 10.5 17 11 15"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Path
        d="M15.5 21C14.8 19.5 13.5 17 13 15"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Central Trunk */}
      <Rect x="11" y="12" width="2" height="6" rx="1" fill={color} />
      {/* Interlocking Cloud Foliage Canopy */}
      <Path
        d="M12 2C9.5 2 7.5 3.8 7.2 6.2C5.3 6.6 4 8.2 4 10.2C4 12.5 5.8 14.3 8.1 14.3H16C18.2 14.3 20 12.5 20 10.3C20 8.4 18.7 6.8 16.9 6.3C16.5 3.9 14.5 2 12 2Z"
        fill="url(#canopyGrad)"
      />
      {/* Interior leaf veining highlight */}
      <Path
        d="M12 4.5C13.5 5.5 14 7.5 13.5 9"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.65}
      />
      <Path
        d="M12 7C10.5 8 9.5 9 10 11"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.55}
      />
    </Svg>
  );
};

/**
 * 🔍 TreeScanIcon — Optical Viewfinder Framing a Tree
 * Used for Identify Menu
 */
export const TreeScanIcon: React.FC<TreeIconProps> = ({
  size = 24,
  color = '#1B5E20',
  focused = false,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Scanner Corner Brackets */}
      <Path
        d="M3 8V5C3 3.9 3.9 3 5 3H8"
        stroke={focused ? '#10B981' : color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Path
        d="M16 3H19C20.1 3 21 3.9 21 5V8"
        stroke={focused ? '#10B981' : color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Path
        d="M3 16V19C3 20.1 3.9 21 5 21H8"
        stroke={focused ? '#10B981' : color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Path
        d="M16 21H19C20.1 21 21 20.1 21 19V16"
        stroke={focused ? '#10B981' : color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Tree Silhouette Inside Lens */}
      <Path
        d="M12 6L8.5 11H10.5L7.5 15.5H11.2V18.5H12.8V15.5H16.5L13.5 11H15.5L12 6Z"
        fill={color}
      />
      {/* Scanning Target Dot */}
      {focused && (
        <Circle cx="12" cy="11.5" r="1.5" fill="#10B981" />
      )}
    </Svg>
  );
};

/**
 * 🌲 ForestGroveIcon — Trio of Western Ghats Native Trees
 * Used for Library Menu
 */
export const ForestGroveIcon: React.FC<TreeIconProps> = ({
  size = 24,
  color = '#1B5E20',
  focused = false,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Background Left Tree (Deciduous) */}
      <Path
        d="M6 9C4.5 9 3.5 10.2 3.5 11.5C3.5 12.8 4.6 13.8 6 13.8C7.4 13.8 8.5 12.8 8.5 11.5C8.5 10.2 7.5 9 6 9Z"
        fill={color}
        opacity={0.65}
      />
      <Rect x="5.5" y="13.5" width="1" height="5.5" fill={color} opacity={0.7} />

      {/* Background Right Tree (Cypress / Ghats Conifer) */}
      <Path
        d="M18 9L15.5 13.5H17L15 16.5H21L19 13.5H20.5L18 9Z"
        fill={color}
        opacity={0.65}
      />
      <Rect x="17.5" y="16.5" width="1" height="2.5" fill={color} opacity={0.7} />

      {/* Foreground Center Majestic Tree */}
      <Path
        d="M12 4C9.8 4 8 5.8 8 8C8 9.2 8.5 10.3 9.4 11C8.6 11.5 8 12.4 8 13.5C8 15 9.2 16.2 10.8 16.2H13.2C14.8 16.2 16 15 16 13.5C16 12.4 15.4 11.5 14.6 11C15.5 10.3 16 9.2 16 8C16 5.8 14.2 4 12 4Z"
        fill={focused ? '#10B981' : color}
      />
      <Rect x="11.2" y="16" width="1.6" height="4.5" rx="0.8" fill={color} />
    </Svg>
  );
};

/**
 * 🗺️ TreeMapPinIcon — Topographic Map with Tree Landmark
 * Used for Map Menu
 */
export const TreeMapPinIcon: React.FC<TreeIconProps> = ({
  size = 24,
  color = '#1B5E20',
  focused = false,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Map Pin Teardrop Shape */}
      <Path
        d="M12 2C8.1 2 5 5.1 5 9C5 14.2 11.1 20.8 11.4 21.1C11.7 21.4 12.3 21.4 12.6 21.1C12.9 20.8 19 14.2 19 9C19 5.1 15.9 2 12 2Z"
        fill={focused ? '#10B981' : color}
      />
      {/* Negative Cutout Tree Inside Pin */}
      <Path
        d="M12 5.5L9.5 9.5H10.8L8.8 12.5H11.3V14.5H12.7V12.5H15.2L13.2 9.5H14.5L12 5.5Z"
        fill="#FFFFFF"
      />
      {/* Ground Shadow Ripple */}
      <Circle cx="12" cy="22" r="3" fill={color} opacity={0.2} />
    </Svg>
  );
};

/**
 * 🪵 TreeLogbookIcon — Tree Growth Rings & Botanical Field Log
 * Used for Observations Menu
 */
export const TreeLogbookIcon: React.FC<TreeIconProps> = ({
  size = 24,
  color = '#1B5E20',
  focused = false,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Outer Tree Ring Cross Section / Book Cover */}
      <Rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="3"
        stroke={focused ? '#10B981' : color}
        strokeWidth="1.8"
      />
      {/* Inner Tree Growth Rings */}
      <Path
        d="M8 8C9.5 7 12 7 14 8"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <Path
        d="M7.5 12C10 10.8 13.5 10.8 16 12"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <Path
        d="M8.5 16C10.5 15 13 15 15 16"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      {/* Botanical Leaf Bookmark Ribbon */}
      <Path
        d="M15 3V9L17 7.5L19 9V3H15Z"
        fill={focused ? '#F59E0B' : '#E8F5E9'}
        stroke={focused ? '#D97706' : color}
        strokeWidth="1"
      />
    </Svg>
  );
};

/**
 * 👑 Majestic Banyan Brand Emblem
 * Used in Top Brand Banner & Headers
 */
export const BanyanBrandEmblem: React.FC<{ size?: number }> = ({ size = 48 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Defs>
        <LinearGradient id="emblemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#10B981" />
          <Stop offset="50%" stopColor="#1B5E20" />
          <Stop offset="100%" stopColor="#064E3B" />
        </LinearGradient>
        <LinearGradient id="glowRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#F59E0B" />
          <Stop offset="100%" stopColor="#10B981" />
        </LinearGradient>
      </Defs>

      {/* Decorative Outer Aura Ring */}
      <Circle cx="24" cy="24" r="22.5" stroke="url(#glowRing)" strokeWidth="1.5" strokeDasharray="3 3" opacity={0.65} />
      <Circle cx="24" cy="24" r="20" fill="url(#emblemGrad)" />

      {/* Sprawling Sacred Banyan Canopy in Gold & White */}
      <Path
        d="M24 8C19.5 8 16 11.2 15.5 15.5C12.5 16.2 10 18.8 10 22C10 25.5 12.8 28.5 16.5 28.5H31.5C35.2 28.5 38 25.5 38 22C38 18.8 35.5 16.2 32.5 15.5C32 11.2 28.5 8 24 8Z"
        fill="#FFFFFF"
        opacity={0.96}
      />

      {/* Majestic Prop Roots Dropping Down */}
      <Path d="M22 28V36M26 28V36" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <Path d="M18 28C18 31 19 34 20 37" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M30 28C30 31 29 34 28 37" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />

      {/* Sunlight Core */}
      <Circle cx="24" cy="18" r="2.8" fill="#F59E0B" />
    </Svg>
  );
};
