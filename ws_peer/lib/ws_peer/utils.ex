defmodule WsPeer.Utils do
  def random_str(), do: random_str(10)
  def random_str(length) do
    :crypto.strong_rand_bytes(length) |> Base.url_encode64 |> binary_part(0, length)
  end
end
