import { useEffect, useState } from "react";
import { Alert, Text, View, BackHandler } from "react-native";

import { useNavigation, useRoute } from "@react-navigation/native";

import { styles } from "./styles";

import { QUIZ } from "../../data/quiz";
import { historyAdd } from "../../storage/quizHistoryStorage";

import { Loading } from "../../components/Loading";
import { Question } from "../../components/Question";
import { QuizHeader } from "../../components/QuizHeader";
import { ConfirmButton } from "../../components/ConfirmButton";
import { OutlineButton } from "../../components/OutlineButton";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  interpolate,
  Easing,
  useAnimatedScrollHandler,
  Extrapolate,
  runOnJS,
} from "react-native-reanimated";
import { ProgressBar } from "../../components/ProgressBar";
import { THEME } from "../../styles/theme";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { OverlayFeedBack } from "../../components/OverlayFeedBack";

import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";

interface Params {
  id: string;
}

type QuizProps = (typeof QUIZ)[0];

const CARD_INCLINATION = 10;
const CARD_SKIP_AREA = -200;

export function Quiz() {
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quiz, setQuiz] = useState<QuizProps>({} as QuizProps);
  const [alternativeSelected, setAlternativeSelected] = useState<null | number>(
    null
  );
  const [statusReply, setStatusReply] = useState(0);

  const shake = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const cardPosition = useSharedValue(0);

  const { navigate } = useNavigation();

  const route = useRoute();
  const { id } = route.params as Params;

  async function playSound(isCorrect: boolean) {
    const file = isCorrect
      ? require("../../assets/correct.mp3")
      : require("../../assets/wrong.mp3");

    const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: true });

    await sound.setPositionAsync(0);
    await sound.playAsync();
  }

  const fixedProgressBarStyles = useAnimatedStyle(() => {
    return {
      position: "absolute",
      zIndex: 1,
      paddingTop: 50,
      backgroundColor: THEME.COLORS.GREY_500,
      width: "110%",
      left: "-5%",
      /* extrapolate garente que seja trabalhado entre os ranges propostos */
      opacity: interpolate(scrollY.value, [50, 90], [0, 10], Extrapolate.CLAMP),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [50, 100],
            [-40, 0],
            Extrapolate.CLAMP
          ),
        },
      ],
    };
  });

  const headerStyles = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [70, 90], [1, 0], Extrapolate.CLAMP),
    };
  });

  function handleSkipConfirm() {
    Alert.alert("Pular", "Deseja realmente pular a questão?", [
      { text: "Sim", onPress: () => handleNextQuestion() },
      { text: "Não", onPress: () => {} },
    ]);
  }

  async function handleFinished() {
    await historyAdd({
      id: new Date().getTime().toString(),
      title: quiz.title,
      level: quiz.level,
      points,
      questions: quiz.questions.length,
    });

    navigate("finish", {
      points: String(points),
      total: String(quiz.questions.length),
    });
  }

  function handleNextQuestion() {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion((prevState) => prevState + 1);
    } else {
      handleFinished();
    }
  }

  async function handleConfirm() {
    if (alternativeSelected === null) {
      return handleSkipConfirm();
    }

    if (quiz.questions[currentQuestion].correct === alternativeSelected) {
      setPoints((prevState) => prevState + 1);
      await playSound(true);
      setStatusReply(1);
      handleNextQuestion();
    } else {
      await playSound(false);
      setStatusReply(2);
      shakeAnimation();
    }

    setAlternativeSelected(null);
  }

  async function shakeAnimation() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    shake.value = withSequence(
      withTiming(3, { duration: 400, easing: Easing.bounce }),
      withTiming(
        0,
        undefined,
        /* espera a animação terminar e executa a função, a função é executada na thread de função  */
        (finished) => {
          "worklet";
          if (finished) {
            runOnJS(handleNextQuestion)();
          }
        }
      )
    );
  }

  const shakeStyleAnimated = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: interpolate(
            shake.value,
            [0, 0.5, 1, 1.5, 2, 2.5, 3],
            [0, -15, 0, 15, 0, -15, 0]
          ),
        },
      ],
    };
  });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      /* event traz as informações da tela event.contentOffset.y 
        Informação da posição do scroll da lista
      */
      scrollY.value = event.contentOffset.y;
    },
  });

  function handleStop() {
    Alert.alert("Parar", "Deseja parar agora?", [
      {
        text: "Não",
        style: "cancel",
      },
      {
        text: "Sim",
        style: "destructive",
        onPress: () => navigate("home"),
      },
    ]);

    return true;
  }

  /* gesto de arrastar para a esqeurda ou direita PAN
  gesto usado para tinder
  event.translateX mostra os valores quando a pessoa segura e arrasta mostra as coordenadas.

  Os gestos tem estagios do movimento, sendo start , update, end
*/

  const onPan = Gesture.Pan()
    .activateAfterLongPress(200)
    /* onUpdate fica observando se teve alguma mudança */
    .onUpdate((event) => {
      const moveToLeft = event.translationX < 0;

      if (moveToLeft) {
        cardPosition.value = event.translationX;
      }
    })
    /* quando termina a animação */
    .onEnd((event) => {
      /* As thread de animação e de executar funcoes sao diferentes
        Animação executa na interface

      */

      if (event.translationX < CARD_SKIP_AREA) {
        /* faz com que informe para o codigo que esse codigo vai ser executado na thread de funcoes
          o segundo parenteses informa os parametros que tera a funcao de dentro do runOnJS
        */
        runOnJS(handleSkipConfirm)();
      }

      /* withTiming coloca o valor de uma forma suave, para nao deixar que o valor setado faça o movimento brusco na animação */
      cardPosition.value = withTiming(0);
    });

  const dragStyles = useAnimatedStyle(() => {
    const rotateZ = cardPosition.value / CARD_INCLINATION;

    return {
      transform: [
        { translateX: cardPosition.value },
        {
          rotateZ: `${rotateZ}deg`,
        },
      ],
    };
  });

  useEffect(() => {
    const quizSelected = QUIZ.filter((item) => item.id === id)[0];
    setQuiz(quizSelected);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (quiz.questions) {
      handleNextQuestion();
    }
  }, [points]);

  useEffect(() => {
    /* Fica escutando o botão do celular, se for clicado escuta o click e chama a função de confirmar a volta */
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleStop
    );

    /* quando se colocar um eventlistener em um useEffect precisa colocar a função de retorno para limpar essa escuta */

    return () => backHandler.remove();
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <OverlayFeedBack status={statusReply} />

      <Animated.View style={fixedProgressBarStyles}>
        <Text style={styles.title}>{quiz.title}</Text>
        <ProgressBar
          total={quiz.questions.length}
          current={currentQuestion + 1}
        />
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.question}
        onScroll={scrollHandler}
        /* rolagem no IOS seja suave e a atualização seje mais rapida */
        scrollEventThrottle={16}
      >
        <Animated.View style={[styles.header, headerStyles]}>
          <QuizHeader
            title={quiz.title}
            currentQuestion={currentQuestion + 1}
            totalOfQuestions={quiz.questions.length}
          />
        </Animated.View>

        <GestureDetector gesture={onPan}>
          <Animated.View style={[shakeStyleAnimated, dragStyles]}>
            <Question
              key={quiz.questions[currentQuestion].title}
              question={quiz.questions[currentQuestion]}
              alternativeSelected={alternativeSelected}
              setAlternativeSelected={setAlternativeSelected}
              onUnMount={() => setStatusReply(0)}
            />
          </Animated.View>
        </GestureDetector>

        <View style={styles.footer}>
          <OutlineButton title="Parar" onPress={handleStop} />
          <ConfirmButton onPress={handleConfirm} />
        </View>
      </Animated.ScrollView>
    </View>
  );
}
