import {COLORS, RADIUS} from './constants';

export const SHADOWS = {
  small: {
    shadowColor: COLORS.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.black,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: COLORS.black,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  }),
};

export const GRADIENTS = {
  primary: {
    colors: COLORS.gradientPrimary,
    start: {x: 0, y: 0},
    end: {x: 1, y: 1},
  },
  secondary: {
    colors: COLORS.gradientSecondary,
    start: {x: 0, y: 0},
    end: {x: 1, y: 1},
  },
  danger: {
    colors: COLORS.gradientDanger,
    start: {x: 0, y: 0},
    end: {x: 1, y: 1},
  },
  gold: {
    colors: COLORS.gradientGold,
    start: {x: 0, y: 0},
    end: {x: 1, y: 1},
  },
  dark: {
    colors: [COLORS.surface, COLORS.background],
    start: {x: 0, y: 0},
    end: {x: 0, y: 1},
  },
};

export const COMMON_STYLES = {
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOWS.medium,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
};
