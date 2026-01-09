# nexus-noir-creator

Start your docker.

`cd nexus-noir-creator`

#### Get the stack ready:

create a .env.docker with

`./install.sh`

then:

`docker compose up -d`

gives you

	 ✔ Network nexus-noir-creator_cyber-noir-network  Created
	 ✔ Container nexus-noir-creator-mailpit-1         Started
	 ✔ Container nexus-noir-creator-mysql-1           Started
	 ✔ Container nexus-noir-creator-backend-1         Started
	 ✔ Container nexus-noir-creator-redis-1           Started
	 ✔ Container nexus-noir-creator-nginx-1           Started

#### Get Laravel
`docker compose exec backend composer install`

#### Install Cyber Noir
`docker compose exec backend php artisan migrate:refresh --seed`


#### Install Vue
`cd frontend;`  
`nvm use 20;`  
`npm i;`  

#### Start Nexus Noir
`npm run dev`

