/**
 * seed.test.js — Automated Tests for Database Seed CLI Argument Parsing
 *
 * Verifies that CLI options and flags (--help, --courses-only, --users-only,
 * --reset, --reset-users, --quiet) are parsed correctly.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs } = require('../seed');

describe('Database Seed Script CLI Flags & Options', () => {
  it('should return default false flags when no arguments are provided', () => {
    const opts = parseArgs([]);
    assert.deepEqual(opts, {
      help: false,
      coursesOnly: false,
      usersOnly: false,
      reset: false,
      resetUsers: false,
      quiet: false,
    });
  });

  it('should correctly parse --help and -h flags', () => {
    assert.equal(parseArgs(['--help']).help, true);
    assert.equal(parseArgs(['-h']).help, true);
    assert.equal(parseArgs([]).help, false);
  });

  it('should correctly parse --courses-only flag', () => {
    const opts = parseArgs(['--courses-only']);
    assert.equal(opts.coursesOnly, true);
    assert.equal(opts.usersOnly, false);
  });

  it('should correctly parse --users-only flag', () => {
    const opts = parseArgs(['--users-only']);
    assert.equal(opts.usersOnly, true);
    assert.equal(opts.coursesOnly, false);
  });

  it('should correctly parse --reset and --reset-users flags', () => {
    const opts = parseArgs(['--courses-only', '--reset']);
    assert.equal(opts.coursesOnly, true);
    assert.equal(opts.reset, true);
    assert.equal(opts.resetUsers, false);

    const resetUserOpts = parseArgs(['--reset-users']);
    assert.equal(resetUserOpts.resetUsers, true);
  });

  it('should correctly parse --quiet and -q flags', () => {
    assert.equal(parseArgs(['--quiet']).quiet, true);
    assert.equal(parseArgs(['-q']).quiet, true);
  });
});
