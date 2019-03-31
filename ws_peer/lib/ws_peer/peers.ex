defmodule WsPeer.Peers do
  use Agent

  def start_link(_) do
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  def all do
    Agent.get(__MODULE__, & &1)
  end

  def get(name) do
    Agent.get(__MODULE__, fn peers -> Map.get(peers, name) end)
  end

  def set(name, loc) do
    Agent.update(__MODULE__, fn peers -> Map.put(peers, name, loc) end)
  end

  def remove(name) do
    IO.puts("#{name} is leaving...")
    Agent.update(__MODULE__, fn peers -> Map.delete(peers, name) end)
  end
end
