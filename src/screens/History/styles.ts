import { StyleSheet } from "react-native";

import { THEME } from "../../styles/theme";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.COLORS.GREY_800,
  },
  history: {
    padding: 32,
    /* garante que a lista cresça e ocupe todo o espaço */
    flexGrow: 1,
  },
  swipeableContainer: {
    width: "100%",
    backgroundColor: THEME.COLORS.DANGER_LIGHT,
    borderRadius: 6,
    height: 90,
    marginBottom: 12,
  },
  swipeableRemove: {
    width: 90,
    height: 90,
    backgroundColor: THEME.COLORS.DANGER_LIGHT,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
});
