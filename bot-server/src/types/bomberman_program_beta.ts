/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/bomberman_program_beta.json`.
 */
export type BombermanProgramBeta = {
  "address": "3XcKrwCkn5e9Gxk7reHZK7SGn4P64hqax4AdTE82fWTU",
  "metadata": {
    "name": "bombermanProgramBeta",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "delegate",
      "discriminator": [
        90,
        147,
        75,
        178,
        85,
        88,
        4,
        137
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "bufferGame",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "game"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                37,
                142,
                189,
                141,
                173,
                84,
                128,
                194,
                8,
                101,
                65,
                46,
                216,
                244,
                181,
                7,
                109,
                165,
                96,
                241,
                54,
                198,
                72,
                253,
                57,
                216,
                235,
                132,
                145,
                136,
                13,
                179
              ]
            }
          }
        },
        {
          "name": "delegationRecordGame",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "game"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataGame",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "game"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "game.id",
                "account": "gamee"
              }
            ]
          }
        },
        {
          "name": "ownerProgram",
          "address": "3XcKrwCkn5e9Gxk7reHZK7SGn4P64hqax4AdTE82fWTU"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "explode",
      "discriminator": [
        120,
        13,
        1,
        196,
        115,
        114,
        189,
        247
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "game",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "matches",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104,
                  101,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeGame",
      "discriminator": [
        44,
        62,
        102,
        247,
        126,
        208,
        130,
        215
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "user.games",
                "account": "user"
              }
            ]
          }
        },
        {
          "name": "matches",
          "writable": true,
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "width",
          "type": {
            "option": "u8"
          }
        },
        {
          "name": "height",
          "type": {
            "option": "u8"
          }
        },
        {
          "name": "arenaSeed",
          "type": {
            "option": "u8"
          }
        },
        {
          "name": "pricePoolLamports",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "initializeUser",
      "discriminator": [
        111,
        17,
        185,
        250,
        60,
        122,
        38,
        254
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  45,
                  112,
                  100,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "joinGame",
      "discriminator": [
        107,
        112,
        18,
        38,
        56,
        173,
        60,
        128
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "x",
          "type": "u8"
        },
        {
          "name": "y",
          "type": "u8"
        }
      ]
    },
    {
      "name": "makeMove",
      "discriminator": [
        78,
        77,
        152,
        203,
        222,
        211,
        208,
        233
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "game",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "direction",
          "type": {
            "defined": {
              "name": "facing"
            }
          }
        },
        {
          "name": "energy",
          "type": "u8"
        }
      ]
    },
    {
      "name": "placeBomb",
      "discriminator": [
        165,
        31,
        36,
        156,
        19,
        206,
        89,
        188
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "game",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer"
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "undelegate",
      "discriminator": [
        131,
        148,
        180,
        198,
        91,
        104,
        42,
        238
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "game.id",
                "account": "gamee"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "gamee",
      "discriminator": [
        206,
        33,
        241,
        128,
        118,
        255,
        238,
        134
      ]
    },
    {
      "name": "matches",
      "discriminator": [
        112,
        180,
        245,
        120,
        27,
        221,
        54,
        204
      ]
    },
    {
      "name": "user",
      "discriminator": [
        159,
        117,
        95,
        227,
        239,
        151,
        58,
        236
      ]
    },
    {
      "name": "vault",
      "discriminator": [
        211,
        8,
        232,
        43,
        2,
        152,
        117,
        119
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidSize",
      "msg": "Invalid Grid size"
    },
    {
      "code": 6001,
      "name": "gameEnded",
      "msg": "Unable to join a game that ended"
    },
    {
      "code": 6002,
      "name": "playerNotFound",
      "msg": "Player is not part of this game"
    },
    {
      "code": 6003,
      "name": "notValidEnergy",
      "msg": "Player is dead"
    },
    {
      "code": 6004,
      "name": "movingIntoNotEmptyCell",
      "msg": "Unable to move into a not empty cell"
    },
    {
      "code": 6005,
      "name": "invalidMovement",
      "msg": "This movement is not valid"
    },
    {
      "code": 6006,
      "name": "invalidJoin",
      "msg": "This position is not valid for joining the game"
    },
    {
      "code": 6007,
      "name": "invalidClaim",
      "msg": "Price can't be claimed"
    },
    {
      "code": 6008,
      "name": "overflow",
      "msg": "Invalid Operation"
    },
    {
      "code": 6009,
      "name": "invalidUser",
      "msg": "Invalid User"
    },
    {
      "code": 6010,
      "name": "invalidAuthority",
      "msg": "Player key does not match user authority"
    }
  ],
  "types": [
    {
      "name": "cell",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "empty"
          },
          {
            "name": "wall"
          },
          {
            "name": "box"
          },
          {
            "name": "bomb",
            "fields": [
              "u8"
            ]
          }
        ]
      }
    },
    {
      "name": "facing",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "up"
          },
          {
            "name": "down"
          },
          {
            "name": "left"
          },
          {
            "name": "right"
          }
        ]
      }
    },
    {
      "name": "gameState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "waiting"
          },
          {
            "name": "active"
          },
          {
            "name": "won",
            "fields": [
              {
                "name": "winner",
                "type": "pubkey"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "gamee",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u32"
          },
          {
            "name": "width",
            "type": "u8"
          },
          {
            "name": "height",
            "type": "u8"
          },
          {
            "name": "seed",
            "type": "u8"
          },
          {
            "name": "ticketPrice",
            "type": "u64"
          },
          {
            "name": "prizeClaimed",
            "type": "bool"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "gameState",
            "type": {
              "defined": {
                "name": "gameState"
              }
            }
          },
          {
            "name": "grid",
            "type": {
              "defined": {
                "name": "grid"
              }
            }
          },
          {
            "name": "tickCount",
            "type": "u64"
          },
          {
            "name": "players",
            "type": {
              "vec": {
                "defined": {
                  "name": "player"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "grid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "cells",
            "type": {
              "vec": {
                "defined": {
                  "name": "cell"
                }
              }
            }
          },
          {
            "name": "width",
            "type": "u8"
          },
          {
            "name": "height",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "matches",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "activeGames",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "player",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "x",
            "type": "u8"
          },
          {
            "name": "y",
            "type": "u8"
          },
          {
            "name": "health",
            "type": "u8"
          },
          {
            "name": "address",
            "type": "pubkey"
          },
          {
            "name": "facing",
            "type": {
              "defined": {
                "name": "facing"
              }
            }
          }
        ]
      }
    },
    {
      "name": "user",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "games",
            "type": "u32"
          },
          {
            "name": "won",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "vault",
      "type": {
        "kind": "struct",
        "fields": []
      }
    }
  ]
};
