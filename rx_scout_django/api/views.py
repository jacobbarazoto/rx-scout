from rest_framework import generics, permissions
from rest_framework.response import Response
from django.contrib.auth.models import User

from .models import Pharmacy, Medication
from .serializers import PharmacySerializer, UserProfileSerializer


class PharmacyListCreateView(generics.ListCreateAPIView):
    queryset = Pharmacy.objects.all()
    serializer_class = PharmacySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # Get medication and location from query parameters
        medication = self.request.query_params.get('medication')
        location = self.request.query_params.get('location')

        # Add logic to filter pharmacies based on medication and location

        return super().get_queryset()

    def perform_create(self, serializer):
        serializer.save()


class PharmacyRetrieveView(generics.RetrieveAPIView):
    queryset = Pharmacy.objects.all()
    serializer_class = PharmacySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class UserProfileView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class PremiumFeaturesView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        # Implement premium features logic
        return Response("Premium Features Content")
