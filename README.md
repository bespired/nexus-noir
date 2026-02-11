# nexus-noir

`git clone https://github.com/bespired/nexus-noir.git`


Start your docker.

`cd nexus-noir`

#### Get the stack ready:

create a .env.docker with

`./install.sh`

then:

`docker compose up -d`

gives you

	 ✔ Network nexus-noir_cyber-noir-network  Created
	 ✔ Container nexus-noir-mailpit-1         Started
	 ✔ Container nexus-noir-mysql-1           Started
	 ✔ Container nexus-noir-backend-1         Started
	 ✔ Container nexus-noir-redis-1           Started
	 ✔ Container nexus-noir-nginx-1           Started

#### Get Laravel
`docker compose exec backend composer install`

#### Install Nexus Noir
`docker compose exec backend php artisan migrate:refresh --seed`

#### Install Nexus Noir assets

Download zip (61Mb).

https://drive.google.com/file/d/1ga7FFXiYeMWAcU69Xs2gsuo-pb7yTyXj/view?usp=drivesdk

Put it in the backup folder.
Then run

`docker compose exec backend php artisan app:install`


#### Install Vue
`cd frontend;`
`nvm use 20;`
`npm i;`

#### Start Nexus Noir
`npm run dev`

