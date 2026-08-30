import AppView from "./components/app/AppView.jsx";
import useAppController from "./hooks/useAppController.js";
import "./App.css";

function App() {
  const app = useAppController();
  return <AppView app={app} />;
}

export default App;
