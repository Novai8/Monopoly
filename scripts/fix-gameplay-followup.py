from pathlib import Path

p = Path('src/engine/gameEngine.ts')
s = p.read_text()
if 'movementTarget?: number;' not in s:
    s = s.replace('    targetPosition?: number;\n  } {', '    targetPosition?: number;\n    movementTarget?: number;\n  } {')
    s = s.replace('      targetPosition: targetPos,\n    };', '      targetPosition: targetPos,\n      movementTarget: targetPos,\n    };')
p.write_text(s)
print('follow-up gameplay patch applied')
