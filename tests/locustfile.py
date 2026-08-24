from locust import HttpUser, task, between

class APIUser(HttpUser):
    # Her bir sanal kullanıcı istek attıktan sonra 1 ile 3 saniye arası beklesin
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        """
        Sanal kullanıcı doğduğu an ilk olarak burası çalışır.
        Önce sisteme giriş yapıp (Login) token almasını sağlıyoruz.
        """

        response = self.client.post("/auth/login", data={
            "username": "test@company.com", 
            "password": "TestPassword123!"
        })
        
        if response.status_code == 200:
            self.token = response.json().get("access_token")

    @task
    def get_departments(self):
        """
        Kullanıcının sürekli tekrar edeceği görev: Departmanları listeleme
        """
        if self.token:
            headers = {"Authorization": f"Bearer {self.token}"}
            # Adına token'ı ekleyerek korumalı rotamıza istek atıyor
            self.client.get("/departments/", headers=headers)