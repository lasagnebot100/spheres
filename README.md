# spheres

Repository for simulating flow fields on a sphere surface.

![Demo](./docs/demo.gif)

## Development

- Run `npm i` to install all dependencies
- Tweak [`src/index.ts`](src/index.ts) to get your desired render
- Run `npm run start` to run the app
- Run `npm run bundle` to create a production build in `dist` (including the static assets from `public`)

## Usage

Render settings can be passed as URL parameters, e.g. `?seed=1234&palette=ice&particles=50000`:

| Parameter   | Description                                                                                    | Default  |
| ----------- | ---------------------------------------------------------------------------------------------- | -------- |
| `seed`      | Seed for all random values; the same seed reproduces the same render                           | random   |
| `palette`   | `fire`, `ice`, `forest`, `pastel`, `spectral`, `bicolor`, `black`, `magenta`, `cyan`, `yellow` | `fire`   |
| `particles` | Number of particles (max. 1,000,000)                                                           | `100000` |

If no seed is given, a random one is generated and written to the URL, so every render can be shared or reproduced.

Keyboard shortcuts:

- `Space`: pause / resume the simulation
- `S`: save the current frame as PNG
- `N`: restart with a new random seed

## Linting

This project uses ESLint and Prettier
