import fs from 'fs';
import glob from 'glob';
import { expect } from 'chai';
import _jsf from '../../src';
import { checkType, checkSchema } from './validator';

export const jsf = _jsf;

export function pick(obj, key) {
  const parts = key.split('.');

  let out = obj;

  while (parts.length) {
    out = out[parts.shift()];
  }

  return out;
}

export function getTests(srcDir) {
  const only = [];
  const all = [];

  glob.sync(`${srcDir}/**/*.json`).forEach(file => {
    let suite;

    try {
      suite = JSON.parse(fs.readFileSync(file));
    } catch (e) {
      console.log(`Invalid JSON: ${file}`);
      console.log(e.message);
      process.exit(1);
    }

    (Array.isArray(suite) ? suite : [suite]).forEach(x => {
      if (x.xdescription) return;

      let _only = false;

      suite = { file, ...x };

      suite.tests = suite.tests.sort((a, b) => {
        if (a.only) return -1;
        if (b.only) return 1;
        return 0;
      }).filter(y => {
        if ((_only && !y.only) || y.xdescription) return false;
        if (y.only) _only = true;
        return true;
      });

      if (x.only || _only) only.push(suite);

      all.push(suite);
    });
  });

  return { only, all };
}

export async function tryTest(test, refs, schema) {
  if (test.skip) return;

  let sample;

  try {
    if (test.async) {
      sample = await _jsf.resolve(schema, refs);
    } else {
      sample = _jsf(schema, refs);
    }
  } catch (error) {
    if (typeof test.throws === 'string') {
      expect(error).to.match(new RegExp(test.throws, 'im'));
    }

    if (typeof test.throws === 'boolean') {
      if (test.throws !== true) {
        throw error;
      }
    }
  }

  if (test.dump) {
    console.log('IN', JSON.stringify(schema, null, 2));
    console.log('OUT', JSON.stringify(sample, null, 2));
    return;
  }

  if (test.type) {
    checkType(sample, test.type);
  }

  if (test.valid) {
    checkSchema(sample, schema, refs);
  }

  if (test.hasProps) {
    test.hasProps.forEach(prop => {
      if (Array.isArray(sample)) {
        sample.forEach(s => {
          expect(s[prop]).not.to.eql(undefined);
        });
      } else {
        expect(sample[prop]).not.to.eql(undefined);
      }
    });
  }

  if (test.onlyProps) {
    expect(Object.keys(sample)).to.eql(test.onlyProps);
  }

  if (test.count) {
    expect((Array.isArray(sample) ? sample : Object.keys(sample)).length).to.eql(test.count);
  }

  if (test.hasNot) {
    expect(JSON.stringify(sample)).not.to.contain(test.hasNot);
  }

  if ('equal' in test) {
    expect(sample).to.eql(test.equal);
  }
}