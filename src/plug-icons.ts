import { ImageSourcePropType } from 'react-native';
import { PlugType } from './travel-info';

// Supplied local PNGs are static requires, so Expo bundles them with the app.
export const plugIconSource: Record<PlugType, ImageSourcePropType> = {
  A: require('../assets/plug-icons/plug_type_a.png'), B: require('../assets/plug-icons/plug_type_b.png'), C: require('../assets/plug-icons/plug_type_c.png'),
  D: require('../assets/plug-icons/plug_type_d.png'), E: require('../assets/plug-icons/plug_type_e.png'), F: require('../assets/plug-icons/plug_type_f.png'),
  G: require('../assets/plug-icons/plug_type_g.png'), H: require('../assets/plug-icons/plug_type_h.png'), I: require('../assets/plug-icons/plug_type_i.png'),
  J: require('../assets/plug-icons/plug_type_j.png'), K: require('../assets/plug-icons/plug_type_k.png'), L: require('../assets/plug-icons/plug_type_l.png'),
  M: require('../assets/plug-icons/plug_type_m.png'), N: require('../assets/plug-icons/plug_type_n.png'), O: require('../assets/plug-icons/plug_type_o.png'),
};
