'use strict';

const Code = require('code');
const Lab = require('lab');

const lab = exports.lab = Lab.script();
const expect = Code.expect;
const Bpmn = require('../..');

lab.experiment('ParallelGateway', () => {

  lab.test('should have inbound and outbound sequence flows', (done) => {
    const processXml = `
<?xml version="1.0" encoding="UTF-8"?>
  <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true">
    <startEvent id="theStart" />
    <parallelGateway id="fork" />
    <parallelGateway id="join" />
    <endEvent id="end" />
    <sequenceFlow id="flow1" sourceRef="theStart" targetRef="fork" />
    <sequenceFlow id="flow2" sourceRef="fork" targetRef="join" />
    <sequenceFlow id="flow3" sourceRef="fork" targetRef="join" />
    <sequenceFlow id="flow4" sourceRef="join" targetRef="end" />
  </process>
</definitions>`;

    const engine = new Bpmn.Engine(processXml);
    engine.startInstance(null, null, (err, execution) => {
      if (err) return done(err);
      const forkActivity = execution.getChildActivityById('fork');
      expect(forkActivity).to.include('inbound');
      expect(forkActivity.inbound).to.have.length(1);
      expect(forkActivity).to.include('outbound');
      expect(forkActivity.outbound).to.have.length(2);

      const joinActivity = execution.getChildActivityById('join');
      expect(joinActivity).to.include('inbound');
      expect(joinActivity.inbound).to.have.length(2);
      expect(joinActivity).to.include('outbound');
      expect(joinActivity.outbound).to.have.length(1);
      done();
    });
  });

  lab.test('should fork multiple diverging flows', (done) => {
    const processXml = `
<?xml version="1.0" encoding="UTF-8"?>
  <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true">
    <startEvent id="theStart" />
    <parallelGateway id="fork" />
    <endEvent id="end1" />
    <endEvent id="end2" />
    <sequenceFlow id="flow1" sourceRef="theStart" targetRef="fork" />
    <sequenceFlow id="flow2" sourceRef="fork" targetRef="end1" />
    <sequenceFlow id="flow3" sourceRef="fork" targetRef="end2" />
  </process>
</definitions>`;

    const engine = new Bpmn.Engine(processXml);
    engine.startInstance(null, null, (err, execution) => {
      if (err) return done(err);

      execution.on('end', (e) => {
        if (e.activity.id === 'theProcess') {
          expect(execution.isEnded).to.equal(true);

          expect(Object.keys(execution.children).length).to.equal(4);
          expect(execution.getChildActivityById('end1').taken, 'end1').to.be.true();
          expect(execution.getChildActivityById('end2').taken, 'end2').to.be.true();
          expect(execution.paths).to.include('flow1');
          expect(execution.paths).to.include('flow2');
          expect(execution.paths).to.include('flow3');
          done();
        }
      });
    });
  });

  lab.test('should fork and join multiple diverging flows', (done) => {
    const processXml = `
<?xml version="1.0" encoding="UTF-8"?>
  <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true">
    <startEvent id="theStart" />
    <parallelGateway id="fork" />
    <parallelGateway id="join" />
    <endEvent id="end" />
    <sequenceFlow id="flow1" sourceRef="theStart" targetRef="fork" />
    <sequenceFlow id="flow2" sourceRef="fork" targetRef="join" />
    <sequenceFlow id="flow3" sourceRef="fork" targetRef="join" />
    <sequenceFlow id="flow4" sourceRef="join" targetRef="end" />
  </process>
</definitions>`;

    const engine = new Bpmn.Engine(processXml);
    engine.startInstance(null, null, (err, execution) => {
      if (err) return done(err);

      execution.on('end', (e) => {
        if (e.activity.id === 'theProcess') {
          expect(execution.isEnded).to.equal(true);

          expect(Object.keys(execution.children).length).to.equal(4);
          expect(execution.getChildActivityById('end').taken, 'end').to.be.true();
          expect(execution.paths).to.include('flow1');
          expect(execution.paths).to.include('flow2');
          expect(execution.paths).to.include('flow3');
          expect(execution.paths).to.include('flow4');
          done();
        }
      });
    });
  });


  lab.experiment('join', () => {
    lab.test('should join diverging fork', (done) => {
      const processXml = `
<?xml version="1.0" encoding="UTF-8"?>
  <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true">
    <startEvent id="theStart" />
    <parallelGateway id="fork" />
    <parallelGateway id="join" />
    <endEvent id="end" />
    <sequenceFlow id="flow1" sourceRef="theStart" targetRef="fork" />
    <sequenceFlow id="flow2" sourceRef="fork" targetRef="join" />
    <sequenceFlow id="flow3" sourceRef="fork" targetRef="join" />
    <sequenceFlow id="flow4" sourceRef="fork" targetRef="join" />
    <sequenceFlow id="flow5" sourceRef="fork" targetRef="join" />
    <sequenceFlow id="flow6" sourceRef="join" targetRef="end" />
  </process>
</definitions>`;

      const engine = new Bpmn.Engine(processXml);
      engine.startInstance(null, null, (err, execution) => {
        if (err) return done(err);

        execution.on('end', () => {
          expect(execution.getChildActivityById('end').taken, 'end').to.be.true();
          expect(execution.paths).to.include('flow1');
          expect(execution.paths).to.include('flow2');
          expect(execution.paths).to.include('flow3');
          expect(execution.paths).to.include('flow4');
          expect(execution.paths).to.include('flow5');
          expect(execution.paths).to.include('flow6');

          Object.keys(execution.children).forEach((id) => {
            const child = execution.children[id];
            expect(child.listenerCount('start'), `start listeners on <${id}>`).to.equal(0);
            expect(child.listenerCount('end'), `end listeners on <${id}>`).to.equal(0);
          });
          execution.sequenceFlows.forEach((flow) => {
            expect(flow.listenerCount('taken'), `taken listeners on <${flow.activity.element.id}>`).to.equal(0);
            expect(flow.listenerCount('discarded'), `discarded listeners on <${flow.activity.element.id}>`).to.equal(0);
          });

          done();
        });
      });
    });

    lab.test('should join even if discarded flow', (done) => {
      const processXml = `
<?xml version="1.0" encoding="UTF-8"?>
  <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true">
    <startEvent id="theStart" />
    <inclusiveGateway id="decision" default="flow4" />
    <parallelGateway id="join" />
    <endEvent id="end" />
    <sequenceFlow id="flow1" sourceRef="theStart" targetRef="decision" />
    <sequenceFlow id="flow2" sourceRef="decision" targetRef="join" />
    <sequenceFlow id="flow3" sourceRef="decision" targetRef="join" />
    <sequenceFlow id="flow4" sourceRef="decision" targetRef="join" />
    <sequenceFlow id="flow5" sourceRef="decision" targetRef="join">
      <conditionExpression xsi:type="tFormalExpression"><![CDATA[
      this.context.input <= 50
      ]]></conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="flow6" sourceRef="join" targetRef="end" />
  </process>
</definitions>`;

      const engine = new Bpmn.Engine(processXml);
      engine.startInstance({
        input: 51
      }, null, (err, execution) => {
        if (err) return done(err);

        execution.on('end', () => {
          expect(execution.getChildActivityById('end').taken, 'end').to.be.true();
          expect(execution.paths).to.include('flow1');
          expect(execution.paths).to.include('flow2');
          expect(execution.paths).to.include('flow3');
          expect(execution.paths).to.not.include('flow4');
          expect(execution.paths).to.not.include('flow5');
          expect(execution.paths).to.include('flow6');

          Object.keys(execution.children).forEach((id) => {
            const child = execution.children[id];
            expect(child.listenerCount('start'), `start listeners on <${id}>`).to.equal(0);
            expect(child.listenerCount('end'), `end listeners on <${id}>`).to.equal(0);
          });
          execution.sequenceFlows.forEach((flow) => {
            expect(flow.listenerCount('taken'), `taken listeners on <${flow.activity.element.id}>`).to.equal(0);
            expect(flow.listenerCount('discarded'), `discarded listeners on <${flow.activity.element.id}>`).to.equal(0);
          });

          done();
        });
      });
    });
  });

  lab.experiment('cancel', () => {
    lab.test('should abort fork', (done) => {
      const processXml = `
<?xml version="1.0" encoding="UTF-8"?>
  <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true">
    <startEvent id="theStart" />
    <parallelGateway id="fork" />
    <parallelGateway id="join" />
    <endEvent id="end" />
    <sequenceFlow id="flow1" sourceRef="theStart" targetRef="fork" />
    <sequenceFlow id="flow2" sourceRef="fork" targetRef="join" />
    <sequenceFlow id="flow3" sourceRef="fork" targetRef="join" />
    <sequenceFlow id="flow4" sourceRef="join" targetRef="end" />
  </process>
</definitions>`;

      const engine = new Bpmn.Engine(processXml);
      engine.startInstance(null, null, (err, execution) => {
        if (err) return done(err);

        const gateway = execution.getChildActivityById('join');
        gateway.once('start', () => {
          execution.terminate();
        });

        execution.on('end', () => {
          expect(execution.paths).to.include('flow1');
          expect(execution.paths).to.include('flow2');
          expect(execution.paths).to.not.include('flow3');
          expect(execution.paths).to.not.include('flow4');
          done();
        });
      });
    });
  });
});
