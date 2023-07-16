# Mocko Tunnel

Tunnel local ports to Mocko, make them accessible securely from anywhere.

## Requirements

- [NodeJS](https://nodejs.org/en/download/) version 14 or higher
- [NPM](https://docs.npmjs.com/cli/v7/configuring-npm/install)

## Installation

### Using NPM

If you have NodeJS installed on version 14 or higher, you can install Mocko Tunnel with:
```sh
npm i -g @mocko/tunnel
```

Alternatively, **you might need `sudo` for Linux or MacOS**:
```sh
sudo npm i -g @mocko/tunnel
```

Check the installation with the `--help` flag:
```sh
$ mocko-tunnel --help
Usage: mocko-tunnel <port> [options]
Examples:
  mocko-tunnel 8080
  mocko-tunnel 8080 --token 00000000-0000-0000-0000-000000000000

Options:

  -h, --help       Shows this screen
  -v, --version    Shows the current version
  -t, --token      Sets the tunnel token. If not provided, the token will be prompted
  -d, --debug      Runs in debug mode
```

## Usage

Mocko Tunnel can be used in the terminal either as `mocko-tunnel` or `mt`. Choose which port will be tunneled to Mocko (example with `8080`) and run:
```sh
mocko-tunnel 8080
```

You'll be prompted to input the project token, or you can pass it directly using the `--token <token>` flag. The project token can be found in the Tunnels page of your Mocko project. Once the tunnel is established, your local port will be securely accessible from anywhere using your project's URL.
