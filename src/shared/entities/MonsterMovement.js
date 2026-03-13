(function () {
    var Constants, Physics;

    if (typeof module !== 'undefined' && module.exports) {
        Constants = require('../Constants');
        Physics = require('../Physics');
    } else if (typeof window !== 'undefined') {
        Constants = window.Constants;
        Physics = window.Physics;
    }

    /**
     * Monster movement logic extracted from MonsterManager.
     * All functions are static and operate on monster objects directly.
     */
    var MonsterMovement = {
        updateAll: function (monsters, levelData, gameLevel, speedMultiplier, wallGrid, gameState) {
            var currentLevelData = levelData[gameLevel];
            var baseSpeed = currentLevelData.monsterSpeed * (20 / 60) * (speedMultiplier || 1.0);

            for (var i = 0; i < monsters.length; i++) {
                var monster = monsters[i];
                var speed = MonsterMovement._applySlowAura(monster, baseSpeed * (monster.speedMultiplier || 1.0), gameState);
                MonsterMovement._moveMonster(monster, speed, gameState, wallGrid);
                MonsterMovement._updateHealthBar(monster);
            }
        },

        _applySlowAura: function (monster, baseSpeed, gameState) {
            var speed = baseSpeed;
            for (var code in gameState.players) {
                var p = gameState.players[code];
                if (p && p.activeBuffs && p.activeBuffs.sandals && p.activeBuffs.sandals.active) {
                    var sdx = monster.x - p.x;
                    var sdy = monster.y - p.y;
                    if (Math.sqrt(sdx * sdx + sdy * sdy) < Constants.SANDALS_SLOW_RADIUS) {
                        speed *= Constants.SANDALS_SLOW_FACTOR;
                        break;
                    }
                }
            }
            return speed;
        },

        _moveMonster: function (monster, speed, gameState, wallGrid) {
            var now = Date.now();
            var behaviorType = monster.behaviorType || (monster.chaser ? 'chaser' : 'wanderer');

            if (monster.demonType === 'Strife') {
                if (monster.isDashing && now < monster.dashEndTime) {
                    MonsterMovement._moveDash(monster, speed, gameState, wallGrid);
                    return;
                }
                if (monster.isDashing) {
                    monster.isDashing = false;
                    monster.dashCooldownEnd = now + Constants.DASH_COOLDOWN;
                }
                if (!monster.isDashing && now >= (monster.dashCooldownEnd || 0) && Math.random() < Constants.DASH_CHANCE) {
                    monster.isDashing = true;
                    monster.dashEndTime = now + Constants.DASH_DURATION;
                }
            }

            if (monster.isDashing) return;

            if (behaviorType === 'guard') {
                MonsterMovement._moveGuard(monster, speed, gameState, wallGrid);
            } else if (monster.chaser) {
                MonsterMovement._moveChaser(monster, speed, gameState, wallGrid);
            } else {
                MonsterMovement._moveWalker(monster, speed, gameState, wallGrid);
            }
        },

        _moveDash: function (monster, speed, gameState, wallGrid) {
            var nearest = Physics.findNearestPlayer(monster, gameState);
            if (!nearest) return;
            var dx = nearest.x - monster.x;
            var dy = nearest.y - monster.y;
            var distance = Math.sqrt(dx * dx + dy * dy);
            var dashSpeed = speed * Constants.DASH_SPEED_MULT;
            var newX = monster.x + (dx / distance) * dashSpeed;
            var newY = monster.y + (dy / distance) * dashSpeed;
            if (!Physics.isOverlapping(newX, newY, monster.width || Constants.MONSTER_WIDTH, monster.height || Constants.MONSTER_HEIGHT, gameState, monster.id, wallGrid)) {
                monster.x = newX;
                monster.y = newY;
            }
        },

        _moveChaser: function (monster, speed, gameState, wallGrid) {
            var nearest = Physics.findNearestPlayer(monster, gameState);
            if (!nearest) return;
            var dx = nearest.x - monster.x;
            var dy = nearest.y - monster.y;
            var moveAngle = Math.atan2(dy, dx);
            if (monster.erratic && Math.random() < Constants.ERRATIC_CHANCE) {
                moveAngle += (Math.random() - 0.5) * 2 * Constants.ERRATIC_ANGLE_OFFSET;
            }
            var newX = monster.x + Math.cos(moveAngle) * speed;
            var newY = monster.y + Math.sin(moveAngle) * speed;
            if (!Physics.isOverlapping(newX, newY, monster.width || Constants.MONSTER_WIDTH, monster.height || Constants.MONSTER_HEIGHT, gameState, monster.id, wallGrid)) {
                monster.x = newX;
                monster.y = newY;
            }
        },

        _moveGuard: function (monster, speed, gameState, wallGrid) {
            var homeX = typeof monster.homeX === 'number' ? monster.homeX : monster.x;
            var homeY = typeof monster.homeY === 'number' ? monster.homeY : monster.y;
            var guardRadius = monster.guardRadius || (Constants.GUARD_RADIUS_MULTIPLIER * Math.max(monster.width || Constants.MONSTER_WIDTH, monster.height || Constants.MONSTER_HEIGHT));
            var nearest = Physics.findNearestPlayer(monster, gameState);
            var hasTargetInTerritory = false;

            if (nearest) {
                var homeDx = nearest.x - homeX;
                var homeDy = nearest.y - homeY;
                hasTargetInTerritory = Math.sqrt(homeDx * homeDx + homeDy * homeDy) <= guardRadius;
            }

            if (hasTargetInTerritory) {
                MonsterMovement._moveTowards(monster, speed, nearest.x, nearest.y, gameState, wallGrid);
                return;
            }

            var dxHome = homeX - monster.x;
            var dyHome = homeY - monster.y;
            var distanceFromHome = Math.sqrt(dxHome * dxHome + dyHome * dyHome);

            if (distanceFromHome > Constants.GUARD_RETURN_THRESHOLD) {
                MonsterMovement._moveTowards(monster, speed, homeX, homeY, gameState, wallGrid);
                return;
            }

            MonsterMovement._moveGuardPatrol(monster, speed, gameState, wallGrid, homeX, homeY, guardRadius);
        },

        _moveTowards: function (monster, speed, targetX, targetY, gameState, wallGrid) {
            var dx = targetX - monster.x;
            var dy = targetY - monster.y;
            var distance = Math.sqrt(dx * dx + dy * dy);
            if (!distance) return;

            var moveAngle = Math.atan2(dy, dx);
            if (monster.erratic && Math.random() < Constants.ERRATIC_CHANCE) {
                moveAngle += (Math.random() - 0.5) * 2 * Constants.ERRATIC_ANGLE_OFFSET;
            }

            var newX = monster.x + Math.cos(moveAngle) * speed;
            var newY = monster.y + Math.sin(moveAngle) * speed;
            if (!Physics.isOverlapping(newX, newY, monster.width || Constants.MONSTER_WIDTH, monster.height || Constants.MONSTER_HEIGHT, gameState, monster.id, wallGrid)) {
                monster.x = newX;
                monster.y = newY;
            }
        },

        _moveGuardPatrol: function (monster, speed, gameState, wallGrid, homeX, homeY, guardRadius) {
            if (monster.walkingDistance === undefined) {
                monster.walkingDistance = Math.random() * (Constants.MAX_WALK_DISTANCE - Constants.MIN_WALK_DISTANCE) + Constants.MIN_WALK_DISTANCE;
                monster.angle = Math.random() * 2 * Math.PI;
            }

            var walkAngle = monster.angle;
            if (monster.erratic && Math.random() < Constants.ERRATIC_CHANCE) {
                walkAngle += (Math.random() - 0.5) * 2 * Constants.ERRATIC_ANGLE_OFFSET;
            }

            var newX = monster.x + Math.cos(walkAngle) * speed;
            var newY = monster.y + Math.sin(walkAngle) * speed;
            var homeDx = newX - homeX;
            var homeDy = newY - homeY;
            var wouldLeaveTerritory = Math.sqrt(homeDx * homeDx + homeDy * homeDy) > guardRadius;

            if (wouldLeaveTerritory) {
                monster.walkingDistance = undefined;
                monster.angle = undefined;
                return;
            }

            if (!Physics.isOverlapping(newX, newY, monster.width || Constants.MONSTER_WIDTH, monster.height || Constants.MONSTER_HEIGHT, gameState, monster.id, wallGrid)) {
                monster.x = newX;
                monster.y = newY;
                monster.walkingDistance -= speed;
            } else {
                monster.walkingDistance = undefined;
                monster.angle = undefined;
            }

            if (monster.walkingDistance <= 0) {
                monster.walkingDistance = undefined;
                monster.angle = undefined;
            }
        },

        _moveWalker: function (monster, speed, gameState, wallGrid) {
            if (monster.walkingDistance === undefined) {
                monster.walkingDistance = Math.random() * (Constants.MAX_WALK_DISTANCE - Constants.MIN_WALK_DISTANCE) + Constants.MIN_WALK_DISTANCE;
                monster.angle = Math.random() * 2 * Math.PI;
            }

            var walkAngle = monster.angle;
            if (monster.erratic && Math.random() < Constants.ERRATIC_CHANCE) {
                walkAngle += (Math.random() - 0.5) * 2 * Constants.ERRATIC_ANGLE_OFFSET;
            }

            var newX = monster.x + Math.cos(walkAngle) * speed;
            var newY = monster.y + Math.sin(walkAngle) * speed;

            if (!Physics.isOverlapping(newX, newY, monster.width || Constants.MONSTER_WIDTH, monster.height || Constants.MONSTER_HEIGHT, gameState, monster.id, wallGrid)) {
                monster.x = newX;
                monster.y = newY;
                monster.walkingDistance -= speed;
            } else {
                monster.walkingDistance = undefined;
                monster.angle = undefined;
            }

            if (monster.walkingDistance <= 0) {
                monster.walkingDistance = undefined;
                monster.angle = undefined;
            }
        },

        _updateHealthBar: function (monster) {
            monster.healthBar.x = monster.x - monster.width / 2;
            monster.healthBar.y = monster.y - monster.height / 2 - 10;
            monster.healthBar.width = (monster.health / monster.maxHealth) * monster.width;

            if (monster.showHealthTimeout && Date.now() > monster.showHealthTimeout) {
                monster.showHealth = false;
                monster.showHealthTimeout = null;
            }
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MonsterMovement;
    } else if (typeof window !== 'undefined') {
        window.MonsterMovement = MonsterMovement;
    }
})();
