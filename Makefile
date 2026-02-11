.PHONY: all dev backend frontend

all: dev

dev:
	make -j 2 backend frontend
backend:
	cd backend && Task run
frontend:
	cd frontend && npm run dev