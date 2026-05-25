try:
	from .services_postgres import delivery_service as delivery_service
except Exception:
	from services_postgres import delivery_service as delivery_service
