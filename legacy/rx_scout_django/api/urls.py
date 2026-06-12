from django.urls import path

from .views import (
    PharmacyListCreateView,
    PharmacyRetrieveView,
    UserProfileView,
    PremiumFeaturesView,
)

app_name = 'api'

urlpatterns = [
    path('pharmacies/', PharmacyListCreateView.as_view(), name='pharmacy-list-create'),
    path('pharmacies/<int:pk>/', PharmacyRetrieveView.as_view(), name='pharmacy-retrieve'),
    path('user/profile/', UserProfileView.as_view(), name='user-profile'),
    path('premium-features/', PremiumFeaturesView.as_view(), name='premium-features'),
]
