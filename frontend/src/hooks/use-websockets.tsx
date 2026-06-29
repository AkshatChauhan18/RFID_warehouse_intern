import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useWebSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Determine WS URL based on your HTTP base URL
    const baseUrl = process.env.FASTAPI_BASE_URL || "http://localhost:8000";
    const wsUrl = baseUrl.replace(/^http/, "ws") + "/api/v1/ws";
    
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event === "inventory_updated") {
        console.log("Real-time update received! Refetching data...");
        // This tells TanStack to instantly refetch all stale data in the background
        queryClient.invalidateQueries(); 
      }
    };

    return () => {
      ws.close();
    };
  }, [queryClient]);
}