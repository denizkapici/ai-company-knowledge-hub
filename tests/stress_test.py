from locust import HttpUser, task, between

class APIUser(HttpUser):
    wait_time = between(1, 3)

    @task(2)
    def test_root_endpoint(self):
        self.client.get("/")

    @task(1)
    def test_exception_handler_speed(self):
        self.client.post("/auth/login", json={})