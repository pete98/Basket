import { SymbolView, SymbolWeight } from 'expo-symbols';
import { StyleProp, View, ViewStyle } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';
import type { IconSymbolName } from './icon-symbol';

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: IconSymbolName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <View>
      <SymbolView
        weight={weight}
        tintColor={color}
        resizeMode="scaleAspectFit"
        name={name as SFSymbol}
        style={[
          {
            width: size,
            height: size,
          },
          style,
        ]}
      />
    </View>
  );
}
