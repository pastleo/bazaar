defmodule WsPeer.Peers do
  use Agent

  def start_link(_) do
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  def query do
    Agent.get(__MODULE__, &Map.keys/1)
  end

  def has?(name) do
    Agent.get(__MODULE__, &Map.has_key?(&1, name))
  end

  def get(name) do
    Agent.get(__MODULE__, &Map.get(&1, name))
  end

  def set(name, payload) do
    Agent.update(__MODULE__, fn peers ->
      Map.update(peers, name, payload, &Map.merge(&1, payload))
    end)
  end

  def remove(name) do
    Agent.update(__MODULE__, &Map.delete(&1, name))
  end
end
