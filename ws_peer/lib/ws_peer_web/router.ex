defmodule WsPeerWeb.Router do
  use WsPeerWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", WsPeerWeb do
    pipe_through :api
  end
end
