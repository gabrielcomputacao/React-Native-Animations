import { View } from "react-native";

import { styles } from "./styles";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";

interface Props {
  total: number;
  current: number;
}

export function ProgressBar({ total, current }: Props) {
  const percentage = Math.round((current / total) * 100);
  const sharedProgress = useSharedValue(percentage);

  const styleAnimated = useAnimatedStyle(() => {
    return {
      width: `${sharedProgress}%`,
    };
  });

  /* o sharedProgress nao muda com variaveis que nao sao observaveis , por isso precisa fazer um useEffect para observar a variavel e 
  notificar o sharedvaled quando mudar, porque o sharedvalue é como se fosse o useState so que em relação as animações que dependem desse
  valor
*/
  useEffect(() => {
    sharedProgress.value = withTiming(percentage);
  }, [current]);

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.progress, styleAnimated]} />
    </View>
  );
}
