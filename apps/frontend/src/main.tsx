import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

const createAppElement = () => (
	<StrictMode>
		<App />
	</StrictMode>
);

const router = createBrowserRouter([
	{
		path: "/about",
		element: createAppElement(),
	},
	{
		path: "/:articleId?",
		element: createAppElement(),
	},
]);

const rootElement = document.getElementById("root");
if (rootElement) {
	createRoot(rootElement).render(<RouterProvider router={router} />);
}
