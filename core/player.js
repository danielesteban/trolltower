import {
  AudioListener,
  BoxBufferGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Raycaster,
  Vector3,
} from './three.js';
import DesktopControls from './desktop.js';
import Head from '../renderables/head.js';
import Hand from '../renderables/hand.js';
import Marker from '../renderables/marker.js';
import Pointer from '../renderables/pointer.js';

// Player controller

class Player extends Group {
  constructor({
    camera,
    dom,
    xr,
  }) {
    super();
    this.add(camera);
    this.auxMatrixA = new Matrix4();
    this.auxMatrixB = new Matrix4();
    this.auxVector = new Vector3();
    this.auxDestination = new Vector3();
    this.attachments = { left: [], right: [] };
    this.direction = new Vector3();
    this.head = new AudioListener();
    this.head.rotation.order = 'YXZ';
    const physicsMaterial = new MeshBasicMaterial({ visible: false });
    this.head.physics = new Mesh(
      new BoxBufferGeometry(0.3, 0.3, 0.3),
      physicsMaterial
    );
    this.head.add(this.head.physics);
    const controllerPhysics = new Mesh(
      new BoxBufferGeometry(0.015, 0.09, 0.14),
      physicsMaterial
    );
    controllerPhysics.position.set(0, -0.1 / 3, 0.02);
    this.controllers = [...Array(2)].map((v, i) => {
      const controller = xr.getController(i);
      this.add(controller);
      controller.buttons = {
        forwards: false,
        backwards: false,
        leftwards: false,
        rightwards: false,
        trigger: false,
        grip: false,
        primary: false,
        secondary: false,
      };
      controller.marker = new Marker();
      controller.physics = controllerPhysics.clone();
      controller.pointer = new Pointer();
      controller.add(controller.pointer);
      controller.raycaster = new Raycaster();
      controller.raycaster.far = 8;
      controller.worldspace = {
        lastPosition: new Vector3(),
        movement: new Vector3(),
        position: new Vector3(),
        quaternion: new Quaternion(),
      };
      controller.addEventListener('connected', ({ data: { handedness, gamepad } }) => {
        if (controller.hand) {
          return;
        }
        const hand = new Hand({ handedness });
        controller.hand = hand;
        controller.gamepad = gamepad;
        controller.add(hand);
        controller.add(controller.physics);
        const attachments = this.attachments[handedness];
        if (attachments) {
          attachments.forEach((attachment) => {
            controller.add(attachment);
          });
        }
      });
      controller.addEventListener('disconnected', () => {
        if (!controller.hand) {
          return;
        }
        const attachments = this.attachments[controller.hand.handedness];
        if (attachments) {
          attachments.forEach((attachment) => {
            controller.remove(attachment);
          });
        }
        controller.remove(controller.hand);
        controller.remove(controller.physics);
        delete controller.hand;
        delete controller.gamepad;
        controller.marker.visible = false;
        controller.pointer.visible = false;
      });
      return controller;
    });
    this.desktopControls = new DesktopControls({
      enabled: (
        document.location.origin === 'https://localhost:5000'
        || window.localStorage.getItem('debug')
      ),
      renderer: dom.renderer,
      xr,
    });
    {
      const key = 'trolltower::skin';
      let skin = localStorage.getItem(key);
      if (!skin) {
        skin = Head.generateTexture().toDataURL();
        localStorage.setItem(key, skin);
      }
      this.skin = skin;
    }
  }

  attach(attachment, handedness) {
    const { attachments, controllers } = this;
    attachments[handedness].push(attachment);
    controllers.forEach((controller) => {
      if (controller.hand && controller.hand.handedness === handedness) {
        controller.add(attachment);
      }
    });
  }

  detachAll() {
    const { attachments, head, controllers } = this;
    delete head.physics.onContact;
    controllers.forEach((controller) => {
      delete controller.physics.onContact;
      const children = controller.hand && attachments[controller.hand.handedness];
      if (children) {
        children.forEach((child) => (
          controller.remove(child)
        ));
      }
    });
    attachments.left.length = 0;
    attachments.right.length = 0;
  }

  onAnimationTick({ animation: { delta }, camera }) {
    const {
      auxMatrixA: rotation,
      auxVector: vector,
      controllers,
      desktopControls,
      destination,
      direction,
      head,
      position,
      speed,
    } = this;
    camera.matrixWorld.decompose(head.position, head.quaternion, vector);
    head.updateMatrixWorld();
    controllers.forEach(({
      buttons,
      hand,
      gamepad,
      marker,
      matrixWorld,
      pointer,
      raycaster,
      worldspace,
    }) => {
      if (!hand) {
        return;
      }
      marker.visible = false;
      pointer.visible = false;
      [
        ['forwards', gamepad.axes[3] <= -0.5],
        ['backwards', gamepad.axes[3] >= 0.5],
        ['leftwards', gamepad.axes[2] <= -0.5],
        ['rightwards', gamepad.axes[2] >= 0.5],
        ['trigger', gamepad.buttons[0] && gamepad.buttons[0].pressed],
        ['grip', gamepad.buttons[1] && gamepad.buttons[1].pressed],
        ['primary', gamepad.buttons[4] && gamepad.buttons[4].pressed],
        ['secondary', gamepad.buttons[5] && gamepad.buttons[5].pressed],
      ].forEach(([key, value]) => {
        buttons[`${key}Down`] = value && buttons[key] !== value;
        buttons[`${key}Up`] = !value && buttons[key] !== value;
        buttons[key] = value;
      });
      hand.setFingers({
        thumb: gamepad.buttons[3] && gamepad.buttons[3].touched,
        index: gamepad.buttons[0] && gamepad.buttons[0].pressed,
        middle: gamepad.buttons[1] && gamepad.buttons[1].pressed,
      });
      hand.animate({ delta });
      worldspace.lastPosition.copy(worldspace.position);
      matrixWorld.decompose(worldspace.position, worldspace.quaternion, vector);
      worldspace.movement.subVectors(worldspace.position, worldspace.lastPosition);
      rotation.identity().extractRotation(matrixWorld);
      raycaster.ray.origin
        .addVectors(
          worldspace.position,
          vector.set(0, -0.1 / 3, 0).applyMatrix4(rotation)
        );
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(rotation);
    });
    desktopControls.onAnimationTick({ camera, delta, player: this });
    if (destination) {
      const step = speed * delta;
      const distance = destination.distanceTo(position);
      if (distance <= step) {
        position.copy(destination);
        delete this.destination;
        return;
      }
      position.addScaledVector(direction, step);
    }
  }

  fly({ animation: { delta }, direction, movement }) {
    const {
      help,
      auxVector: vector,
      position,
    } = this;
    position.addScaledVector(
      vector
        .copy(movement)
        .normalize()
        .applyQuaternion(direction),
      delta * 4
    );
    if (help) {
      help.dispose();
    }
  }

  move(offset) {
    const { controllers, head, position } = this;
    position.add(offset);
    head.position.add(offset);
    controllers.forEach(({ hand, worldspace }) => {
      if (hand) {
        worldspace.position.add(offset);
      }
    });
  }

  rotate(radians) {
    const {
      auxMatrixA: transform,
      auxMatrixB: matrix,
      controllers,
      head,
      position,
    } = this;
    transform.makeTranslation(
      head.position.x, position.y, head.position.z
    );
    transform.multiply(
      matrix.makeRotationY(radians)
    );
    transform.multiply(
      matrix.makeTranslation(
        -head.position.x, -position.y, -head.position.z
      )
    );
    this.applyMatrix4(transform);
    head.applyMatrix4(transform);
    controllers.forEach(({ hand, worldspace }) => {
      if (hand) {
        worldspace.position.applyMatrix4(transform);
      }
    });
  }

  teleport(point) {
    const { head, position } = this;
    position
      .subVectors(point, position.set(
        head.position.x - position.x,
        0,
        head.position.z - position.z
      ));
    head.position.x = point.x;
    head.position.z = point.z;
  }

  translocate(point) {
    const {
      auxDestination: destination,
      direction,
      head,
      position,
    } = this;
    destination
      .subVectors(point, destination.set(
        head.position.x - position.x,
        0,
        head.position.z - position.z
      ));
    this.destination = destination;
    this.speed = Math.max(destination.distanceTo(position) / 0.2, 2);
    direction
      .copy(destination)
      .sub(position)
      .normalize();
  }
}

export default Player;
