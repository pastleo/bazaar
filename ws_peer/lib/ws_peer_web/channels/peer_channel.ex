defmodule WsPeerWeb.PeerChannel do
  use Phoenix.Channel

  def join("peer:" <> name, %{"params" => %{"loc" => loc}}, socket) do
    WsPeer.Peers.set(name, loc)
    socket
    |> assign(:name, name)
    |> (&{:ok, &1}).()
  end

  def handle_in("all", _, socket) do
    {:reply, {:ok, %{peers: WsPeer.Peers.all()}}, socket}
  end

  def handle_in("pub", %{"loc" => loc}, socket) do
    WsPeer.Peers.set(socket.assigns.name, loc)
    {:noreply, socket}
  end

  def handle_in("tell", %{"who" => who, "payload" => payload}, socket) do
    WsPeerWeb.Endpoint.broadcast("peer:" <> who, "told", %{"payload" => payload, "from" => socket.assigns.name})
    {:noreply, socket}
  end

  def terminate(reason, socket) do
    WsPeer.Peers.remove(socket.assigns.name)
    reason
  end
end
