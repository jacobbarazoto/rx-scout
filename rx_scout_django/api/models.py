from django.db import models
from django.contrib.auth.models import User


class Pharmacy(models.Model):
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=255)
    # Add more fields as needed

    def __str__(self):
        return self.name


class Medication(models.Model):
    name = models.CharField(max_length=255)
    # Add more fields as needed

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    # Add more fields as needed

    def __str__(self):
        return self.user.username
