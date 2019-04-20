defmodule WsPeerWeb.PeerChannel do
  use Phoenix.Channel

  def join("peer:" <> name, %{"params" => %{}}, socket = %{assigns: %{socket_id: socket_id}}) do
    WsPeer.Peers.set(name, %{socket_id: socket_id, channel_pid: self()})
    socket
    |> assign(:name, name)
    |> (&{:ok, &1}).()
  end

  def send(name, term, payload) do
    WsPeerWeb.Endpoint.broadcast("peer:" <> name, "send", %{"term" => term, "payload" => payload})
  end

  def request(name, term, payload) do
    WsPeerWeb.Endpoint.broadcast("peer:" <> name, "request", %{"id" => WsPeer.Requestings.generate(), "term" => term, "payload" => payload})
    WsPeer.Requestings.wait_response()
  end

  def tell(who, via, term, payload) do
    WsPeerWeb.Endpoint.broadcast("peer:" <> via, "tell", %{"id" => WsPeer.Requestings.generate(), "who" => who, "term" => term, "payload" => payload})
    WsPeer.Requestings.wait_response()
  end

  def handle_in("send", _, socket) do
    {:noreply, socket}
  end

  def handle_in("request", %{"term" => "query-peers", "payload" => _payload}, socket) do
    {:reply, {:ok, %{payload: %{ peers: WsPeer.Peers.query()}}}, socket}
  end

  def handle_in("request", %{"term" => "ping", "payload" => _payload}, socket) do
    {:reply, {:ok, %{payload: %{}}}, socket}
  end

  def handle_in("request", _, socket) do
    {:reply, {:err, %{reason: "UNHANDLED"}}, socket}
  end

  def handle_in("tell", %{"who" => who, "term" => term, "payload" => payload}, socket) do
    if WsPeer.Peers.has?(who) do
      WsPeerWeb.Endpoint.broadcast("peer:" <> who, "told", %{"from" => socket.assigns.name, "term" => term, "payload" => payload})
      {:ok, %{}}
    else
      {:err, %{reason: "UNKNOWN_PEER"}}
    end
    |> (&{:reply, &1, socket}).()
  end

  def handle_in("told", %{"from" => _from, "term" => _term, "payload" => _payload}, socket) do
    {:noreply, socket}
  end

  def handle_in("response", %{"id" => id, "payload" => payload}, socket) do
    WsPeer.Requestings.response(id, payload)
    {:noreply, socket}
  end

  def handle_in(_, _, socket) do
    {:noreply, socket}
  end

  def stop(name) do
    send(WsPeer.Peers.get(name).channel_pid, :stop)
  end

  def handle_info(:stop, socket) do
    {:stop, :shutdown, socket}
  end

  def terminate(reason, socket) do
    WsPeer.Peers.remove(socket.assigns.name)
    reason
  end
end
