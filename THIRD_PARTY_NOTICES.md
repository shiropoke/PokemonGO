# Third-party notices

## Leek Duck / ScrapedDuck

Event data is provided by [Leek Duck](https://leekduck.com/) through [ScrapedDuck](https://github.com/bigfoott/ScrapedDuck).

ScrapedDuck permits use of its API data when the application is not hidden behind a paywall, is not monetized with advertisements, and credits both ScrapedDuck and Leek Duck. This project follows those conditions.

## PokeMiners

Type, move, evolution, power-up cost, and type-effectiveness data are extracted
at build time from the [PokeMiners Game Master repository](https://github.com/PokeMiners/game_masters).
Japanese move labels are derived from the corresponding assets published in
the [PokeMiners pogo_assets repository](https://github.com/PokeMiners/pogo_assets).
The browser receives only the compact generated `public/data/game-data.json`;
it does not download the full Game Master at runtime. PokeMiners notes that
obfuscated fields may change without notice, so the generator validates and
defensively skips unsupported records instead of guessing their meaning.

Pokémon GO game content remains the property of The Pokémon Company and
Niantic. This independent, non-commercial project is not affiliated with or
endorsed by them or by PokeMiners.

## PvPoke

Pokémon base statistics and form metadata are loaded from the [PvPoke Game Master](https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json). PvPoke is distributed under the [MIT License](https://github.com/pvpoke/pvpoke/blob/master/LICENSE).

```text
MIT License
Copyright (c) 2019 pvpoke
```

This project does not copy PvPoke application source code. Its CP and PvP IV
ranking implementation is maintained locally and uses the Game Master data for
base statistics and result verification.

The Pokémon-species PvP pages use compact snapshots of PvPoke's MIT-licensed
open-league Overall ranking data for Great, Ultra, and Master League. The source
files are located at
`src/data/rankings/all/overall/rankings-{1500,2500,10000}.json` in the PvPoke
repository. Score and recommended moves shown by this project remain attributed
to PvPoke and can change when PvPoke regenerates its simulations.

## PokeAPI

Japanese species and form names are derived from the CSV data in the [PokeAPI repository](https://github.com/PokeAPI/pokeapi). PokeAPI is distributed under the BSD 3-Clause License.

```text
Copyright (c) © 2013–2023 Paul Hallett and PokéAPI contributors
(https://github.com/PokeAPI/pokeapi#contributing). Pokémon and Pokémon
character names are trademarks of Nintendo.

All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice,
  this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.
* Neither the name of PokéAPI nor the names of its contributors may be used to
  endorse or promote products derived from this software without specific
  prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```
