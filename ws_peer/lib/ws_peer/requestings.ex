defmodule WsPeer.Requestings do
  use Agent

  def start_link(_) do
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  def generate() do
    id = WsPeer.Utils.random_str()
    requesting_pid = self()
    Agent.update(__MODULE__, &Map.put(&1, id, requesting_pid))
    id
  end

  def wait_response(), do: wait_response(5000)
  def wait_response(timeout) do
    receive do
      response -> response
    after
      timeout -> :timeout
    end
  end

  def response(id, payload) do
    requesting_pid = Agent.get_and_update(__MODULE__, &Map.pop(&1, id))
    send(requesting_pid, payload)
  end
end
