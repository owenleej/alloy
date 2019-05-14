import createComponent from "./createComponent";
import networkStrategyFactory from "./networkStrategy";

const networkStrategy = networkStrategyFactory(window);

const createNetwork = component => {
  return createComponent(component, networkStrategy);
};

createNetwork.namespace = "Network";

export default createNetwork;
