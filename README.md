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

#### Install Nexus Noir
`docker compose exec backend php artisan migrate:refresh --seed`

#### Install Nexus Noir assets

Download zip (100Mb).

https://drive.google.com/file/d/1Gfxcyktd-Wdlr87CToStK5rlRHTz2Az8/view?usp=sharing

Put it in the backup folder.
Then run

`docker compose exec backend php artisan app:install`


#### Install Vue
`cd frontend;`
`nvm use 20;`
`npm i;`

#### Start Nexus Noir
`npm run dev`

