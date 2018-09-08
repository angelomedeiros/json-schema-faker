import random from '../core/random';

/**
 * Generates randomized ipv4 address.
 *
 * @returns {string}
 */
function ipv4Generator() {
  return [0, 0, 0, 0].map(function() {
    return random.number(0, 255);
  }).join('.');
}

export default ipv4Generator;
