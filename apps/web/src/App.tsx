import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./routes";
import { SimulatorDrawer } from "./dev/SimulatorDrawer";

const queryClient = new QueryClient();

export default function App() {
  const isMock = import.meta.env.VITE_USE_MOCKS === "true";

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {isMock && <SimulatorDrawer />}
    </QueryClientProvider>
  );
}
