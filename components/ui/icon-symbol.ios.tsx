import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleProp, View, ViewStyle } from 'react-native';

// SF Symbol to Material Icon mapping
const MAPPING: Record<string, string> = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'leaf.fill': 'eco',
  'drop.fill': 'water-drop',
  'flame.fill': 'local-fire-department',
  'birthday.cake.fill': 'cake',
  'cup.and.saucer.fill': 'local-cafe',
  'bag.fill': 'shopping-bag',
  'snowflake': 'ac-unit',
  'archivebox.fill': 'inventory',
  'apple.fill': 'apple',
  'cart.fill': 'shopping-cart',
  'applescript.fill': 'cake',
  'cup.fill': 'local-cafe',
  'star.fill': 'star',
  'sparkles': 'auto-awesome',
  'carrot.fill': 'eco',
  'tray.fill': 'inventory',
  'basket.fill': 'shopping-bag',
  'drop.circle.fill': 'water-drop',
  'flame.circle.fill': 'local-fire-department',
  'house.circle.fill': 'home',
  'fish.fill': 'set-meal',
  'square.grid.2x2.fill': 'apps',
  'person.fill': 'person',
  'magnifyingglass': 'search',
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  const materialIconName = MAPPING[name as string] as any;
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <SymbolView
        weight={weight}
        tintColor={color}
        resizeMode="scaleAspectFit"
        name={name}
        style={[
          {
            width: size,
            height: size,
          },
          style,
        ]}
      />
      {materialIconName && (
        <MaterialIcons 
          name={materialIconName} 
          size={size} 
          color={color} 
          style={style}
        />
      )}
    </View>
  );
}
